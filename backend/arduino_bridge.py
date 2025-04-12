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
from scipy.signal import find_peaks

# CONFIGURATION
BAUDRATE = 115200
SERIAL_TIMEOUT = 0.05  # Adjusted to balance responsiveness and stability
REDIS_HOST = "localhost"
REDIS_PORT = 6379
FLASK_URL = "http://localhost:5000/api/vibration"
SENSOR_CHANNEL = "sensor_updates"
MOTOR_CHANNEL = "control_updates"
RELAY_CHANNEL = "relay_updates"
VOLTAGE_CUTOFF_THRESHOLD = 14.7
charging_enabled = True
current_frequency = 0.0

# FFT Config
NUM_SAMPLES = 256
SAMPLING_RATE_HZ = 201.25
FREQ_UPDATE_INTERVAL = 0.25  # seconds
accel_buffer = []
last_fft_time = time.time()
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
def calibrate_frequency(raw_freq):
    raw_freq = 0.0002*pow(raw_freq,2)+0.4353*raw_freq-0.0995
    return raw_freq


# def calibrate_frequency(raw_freq):
    calibration_points = {
        0:0,
        12:5,
        23: 10,
        34: 15,
        45: 20,
        56: 25,
    

    }
    raw_freqs = sorted(calibration_points.keys())
    for i in range(len(raw_freqs) - 1):
        f1, f2 = raw_freqs[i], raw_freqs[i + 1]
        if f1 <= raw_freq <= f2:
            real_f1 = calibration_points[f1]
            real_f2 = calibration_points[f2]
            ratio = (raw_freq - f1) / (f2 - f1)
            return real_f1 + ratio * (real_f2 - real_f1)
    if raw_freq <= raw_freqs[0]:
        return calibration_points[raw_freqs[0]]
    if raw_freq >= raw_freqs[-1]:
        return calibration_points[raw_freqs[-1]]
    return raw_freq

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

def estimate_frequency_psd(buffer, fs, last_freq=None):
    if len(buffer) < 32:
        return 0.0

    accel_array = np.array(buffer)

    if np.ptp(accel_array) < 0.05:
        return 0.0

    accel_array -= np.mean(accel_array)

    if len(accel_array) < NUM_SAMPLES:
        accel_array = np.pad(accel_array, (0, NUM_SAMPLES - len(accel_array)), mode='constant')

    hann_window = hann(NUM_SAMPLES)
    bias_window = np.exp(np.linspace(0, -4, NUM_SAMPLES))  # prioritize newer samples
    hybrid_window = hann_window * bias_window
    windowed = accel_array * hybrid_window

    freqs, psd = welch(windowed, fs=fs, nperseg=NUM_SAMPLES)
    valid = (freqs >= 2) & (freqs <= 60)
    freqs, psd = freqs[valid], psd[valid]

    if len(psd) == 0:
        return 0.0

    # Suppress harmonics by applying harmonic penalty
    # Apply harmonic suppression
    harmonic_penalty = 1 - (freqs / freqs[-1])**2
    psd *= harmonic_penalty

    peaks, props = find_peaks(psd, height=0.00005)

    if len(peaks) == 0:
        return 0.0

    peak_heights = props["peak_heights"]
    max_idx = np.argmax(peak_heights)
    fundamental_freq = freqs[peaks[max_idx]]

    # If recent freq known, prefer closest
    if last_freq is not None:
        closest_peak = min(peaks, key=lambda i: abs(freqs[i] - last_freq))
        return freqs[closest_peak]

    return fundamental_freq
def process_motor_commands(ser):
    global last_motor_send_time
    current_time = time.time()
    if motor_command_queue and (current_time - last_motor_send_time) > MOTOR_SEND_INTERVAL:
        pwm_value = motor_command_queue.popleft()
        try:
            ser.reset_input_buffer()  # flush input to avoid clashing reads
            ser.write(f"MOTOR:{pwm_value}\n".encode())
            ser.flush()
            time.sleep(0.01)  # let Arduino handle it
            last_motor_send_time = current_time
            print(f"Sent Motor Command: PWM {pwm_value}")
        except Exception as e:
            print(f"Error sending motor command: {e}")
def process_relay_commands(ser):
    global last_relay_send_time
    current_time = time.time()
    if relay_command_queue and (current_time - last_relay_send_time) > RELAY_SEND_INTERVAL:
        relay_action = relay_command_queue.popleft()
        try:
            ser.reset_input_buffer()  # flush before write
            ser.write(f"RELAY:{relay_action}\n".encode())
            ser.flush()
            time.sleep(0.01)
            last_relay_send_time = current_time
            print(f"Sent Relay Command: {relay_action}")
        except Exception as e:
            print(f"Error sending relay command: {e}")
def arduino_bridge():
    global charging_enabled, current_frequency, last_fft_time

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

                current_time = time.time()
                buffer_fill_ratio = len(accel_buffer) / NUM_SAMPLES
                if buffer_fill_ratio >= 0.5 and (current_time - last_fft_time) >= FREQ_UPDATE_INTERVAL:
                    freq_estimate = estimate_frequency_psd(accel_buffer, SAMPLING_RATE_HZ)
                    alpha = 0.05  # stronger smoothing
                    if freq_estimate > 0:
                        calibrated = calibrate_frequency(freq_estimate)
                        current_frequency = alpha * calibrated + (1 - alpha) * current_frequency
                    else:
                        current_frequency *= 0.98
                    last_fft_time = current_time


                formatted_data = {
                    "frequency": current_frequency,
                    "raw_frequency": current_frequency,
                    "intensity": abs(z_val),
                    "temperature": data["temperature"],
                    "voltage": data["voltage"],
                    "relay_status": data["relay_state"],
                    "has_window": buffer_fill_ratio >= 1.0,

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
