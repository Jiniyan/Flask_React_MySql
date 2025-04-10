import serial
import serial.tools.list_ports
import redis
import json
import time
import requests
import numpy as np
from scipy.signal import welch
from datetime import datetime
from collections import deque
import threading
import traceback
from bridge_status import set_arduino_status
from scipy.signal.windows import hann

# CONFIGURATION
BAUDRATE = 115200
SERIAL_TIMEOUT = 0.05  # Adjusted to balance responsiveness and stability
REDIS_HOST = "localhost"
REDIS_PORT = 6379
FLASK_URL = "http://localhost:5000/api/vibration"
SENSOR_CHANNEL = "sensor_updates"
MOTOR_CHANNEL = "control_updates"
RELAY_CHANNEL = "relay_updates"
VOLTAGE_CUTOFF_THRESHOLD = 14.4
charging_enabled = False
current_frequency = 0.0

# FFT Config
NUM_SAMPLES = 805
SAMPLING_RATE_HZ = 201.25
FREQ_UPDATE_STEP = 10
accel_buffer = []
sample_counter = 0
window = hann(NUM_SAMPLES)
freq_history = deque(maxlen=5)

# Command queues
motor_command_queue = deque(maxlen=5)
relay_command_queue = deque(maxlen=5)

# Rate limiting
last_motor_send_time = 0
last_relay_send_time = 0
MOTOR_SEND_INTERVAL = 0.1
RELAY_SEND_INTERVAL = 0.1


def find_arduino_port():
    ports = [port.device for port in serial.tools.list_ports.comports()
             if 'ttyUSB' in port.device or 'ttyACM' in port.device]
    if not ports:
        print("No Arduino found.")
        return None
    return ports[0]


def read_arduino_csv(ser):
    try:
        line = ser.readline().decode("utf-8", errors="ignore").strip()
        parts = line.split(",")
        if len(parts) != 5:
            return None
        z, voltage, temp, relay_state, timestamp = map(float, parts)
        return {
            "z": z,
            "voltage": voltage,
            "temperature": temp,
            "relay_state": int(relay_state),
            "timestamp": timestamp
        }
    except:
        return None


def send_data_to_flask(data):
    try:
        response = requests.post(FLASK_URL, json=data)
        if response.status_code == 200:
            print("Data sent to Flask successfully!")
        else:
            print(f"Failed to send data to Flask: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")


def map_frequency_to_pwm(frequency):
    freq_pwm_map = {
        0: 0,
        5.5: 30,
        11.5: 60,
        18: 90,
        24: 120,
        30: 150,
        36: 180,
        42: 210,
        48: 240,
        60: 255,
    }
    freqs = sorted(freq_pwm_map.keys())
    for i in range(len(freqs) - 1):
        if freqs[i] <= frequency <= freqs[i + 1]:
            f1, f2 = freqs[i], freqs[i + 1]
            p1, p2 = freq_pwm_map[f1], freq_pwm_map[f2]
            ratio = (frequency - f1) / (f2 - f1)
            return int(p1 + ratio * (p2 - p1))
    if frequency <= freqs[0]:
        return freq_pwm_map[freqs[0]]
    if frequency >= freqs[-1]:
        return freq_pwm_map[freqs[-1]]
    return 0


def estimate_frequency_psd(buffer, fs):
    accel_array = np.array(buffer)
    if np.ptp(accel_array) < 0.001:
        return 0.0
    accel_array -= np.mean(accel_array)
    windowed = accel_array * window
    freqs, psd = welch(windowed, fs=fs, nperseg=NUM_SAMPLES)
    peak_power = np.max(psd)
    if peak_power < 1e-8:
        return 0.0
    return freqs[np.argmax(psd)]


def process_motor_commands(ser):
    global last_motor_send_time
    current_time = time.time()
    if motor_command_queue and (current_time - last_motor_send_time) > MOTOR_SEND_INTERVAL:
        pwm_value = motor_command_queue.popleft()
        ser.write(f"MOTOR:{pwm_value}\n".encode())
        ser.flush()
        last_motor_send_time = current_time
        print(f"Sent Motor Command: PWM {pwm_value}")


def process_relay_commands(ser):
    global last_relay_send_time
    current_time = time.time()
    if relay_command_queue and (current_time - last_relay_send_time) > RELAY_SEND_INTERVAL:
        relay_action = relay_command_queue.popleft()
        ser.write(f"RELAY:{relay_action}\n".encode())
        ser.flush()
        last_relay_send_time = current_time
        print(f"Sent Relay Command: {relay_action}")


def arduino_bridge():
    global charging_enabled, sample_counter, current_frequency

    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT)
    motor_pubsub = redis_client.pubsub()
    motor_pubsub.subscribe(MOTOR_CHANNEL)

    relay_pubsub = redis_client.pubsub()
    relay_pubsub.subscribe(RELAY_CHANNEL)

    command_pubsub = redis_client.pubsub()
    command_pubsub.subscribe("arduino_commands")

    ser = None
    connected_port = None

    print("Arduino bridge thread started. Waiting for Arduino...")

    while True:
        try:
            if ser is None or not ser.is_open:
                if ser:
                    try:
                        ser.close()
                    except Exception as e:
                        print(f"[Bridge] Error closing bad serial port: {e}")
                ser = None
                arduino_port = find_arduino_port()
                if arduino_port != connected_port:
                    print(f"[Bridge] Found new Arduino port: {arduino_port}")
                    connected_port = arduino_port
                if arduino_port:
                    try:
                        ser = serial.Serial(arduino_port, BAUDRATE, timeout=SERIAL_TIMEOUT)
                        time.sleep(2)
                        ser.reset_input_buffer()
                        print("[Bridge] Arduino connected successfully!")
                        set_arduino_status({
                            "platform": "Connected",
                            "vibration_sensor": "OK",
                            "temperature_sensor": "OK"
                        })
                    except Exception as e:
                        print(f"[Bridge] Failed to open serial: {e}")
                        set_arduino_status({
                            "platform": "Disconnected",
                            "vibration_sensor": "FAIL",
                            "temperature_sensor": "FAIL"
                        })
                        ser = None
                        time.sleep(3)
                        continue
                else:
                    print("[Bridge] No Arduino found. Retrying in 3 seconds...")
                    set_arduino_status({
                        "platform": "Disconnected",
                        "vibration_sensor": "FAIL",
                        "temperature_sensor": "FAIL"
                    })
                    time.sleep(3)
                    continue

            # Handle control commands early
            process_motor_commands(ser)
            process_relay_commands(ser)

            data = read_arduino_csv(ser)
            if data:
                z_val = data["z"]
                accel_buffer.append(z_val)
                if len(accel_buffer) > NUM_SAMPLES:
                    accel_buffer.pop(0)
                    sample_counter += 1

                has_window = len(accel_buffer) == NUM_SAMPLES

                if has_window and sample_counter >= FREQ_UPDATE_STEP:
                    freq_estimate = estimate_frequency_psd(accel_buffer, SAMPLING_RATE_HZ)
                    alpha = 0.2
                    if freq_estimate > 0:
                        current_frequency = alpha * freq_estimate + (1 - alpha) * current_frequency
                    else:
                        current_frequency *= 0.98
                    sample_counter = 0

                formatted_data = {
                    "frequency": current_frequency,
                    "intensity": abs(z_val),
                    "temperature": data["temperature"],
                    "voltage": data["voltage"],
                    "relay_status": data["relay_state"],
                    "has_window": has_window,
                    "buffer_size": len(accel_buffer),
                    "timestamp": datetime.utcnow().isoformat()
                }

                redis_client.publish(SENSOR_CHANNEL, json.dumps(formatted_data))
                send_data_to_flask(formatted_data)
                print("Published Sensor Data:", formatted_data)

                voltage = data["voltage"]
                if voltage:
                    if voltage >= VOLTAGE_CUTOFF_THRESHOLD and charging_enabled:
                        relay_command_queue.append("NEUTRAL")
                        charging_enabled = False
                    elif voltage <= VOLTAGE_CUTOFF_THRESHOLD - 0.3 and not charging_enabled:
                        relay_command_queue.append("CHARGE")
                        charging_enabled = True

            motor_msg = motor_pubsub.get_message(ignore_subscribe_messages=True, timeout=0.01)
            if motor_msg:
                try:
                    control_data = json.loads(motor_msg["data"].decode())
                    frequency = control_data.get("frequency", 0)
                    pwm = map_frequency_to_pwm(frequency)
                    if not motor_command_queue or motor_command_queue[-1] != pwm:
                        motor_command_queue.append(pwm)
                except:
                    print("Invalid motor command.")

            relay_msg = relay_pubsub.get_message(ignore_subscribe_messages=True, timeout=0.01)
            if relay_msg:
                try:
                    relay_data = json.loads(relay_msg["data"].decode())
                    action = relay_data.get("state", "").upper()
                    if action in ["CHARGE", "DISCHARGE", "NEUTRAL"]:
                        if not relay_command_queue or relay_command_queue[-1] != action:
                            relay_command_queue.append(action)
                except:
                    print("Invalid relay command.")

            reconnect_msg = command_pubsub.get_message(ignore_subscribe_messages=True, timeout=0.01)
            if reconnect_msg:
                try:
                    command = json.loads(reconnect_msg["data"].decode())
                    if command.get("action") == "reconnect":
                        print("[Bridge] Reconnect command received!")
                        if ser:
                            try:
                                ser.close()
                            except:
                                pass
                        ser = None
                        continue
                except:
                    print("Invalid reconnect command.")

        except (serial.SerialException, OSError) as e:
            print(f"[Bridge] Serial/OSError: {e}")
            if ser:
                try:
                    ser.close()
                except:
                    pass
            set_arduino_status({
                "platform": "Disconnected",
                "vibration_sensor": "FAIL",
                "temperature_sensor": "FAIL"
            })
            ser = None
            time.sleep(2)

        except Exception as e:
            print("[Bridge] General error:", e)
            set_arduino_status({
                "platform": "Disconnected",
                "vibration_sensor": "FAIL",
                "temperature_sensor": "FAIL"
            })
            raise


def safe_arduino_bridge():
    while True:
        try:
            arduino_bridge()
        except Exception as e:
            print(f"[Watchdog] Arduino bridge crashed: {e}")
            traceback.print_exc()
            print("[Watchdog] Restarting bridge in 3 seconds...")
            time.sleep(3)


def start_arduino_bridge():
    thread = threading.Thread(target=safe_arduino_bridge, daemon=True)
    thread.start()
    print("Arduino bridge watchdog running in background.")
