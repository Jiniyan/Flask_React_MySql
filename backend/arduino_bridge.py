import serial
import statistics
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
import re
from scipy.fft import rfft, rfftfreq

# CONFIGURATION
BAUDRATE = 115200
SERIAL_TIMEOUT = 0.05
REDIS_HOST = "localhost"
REDIS_PORT = 6379
FLASK_URL = "http://localhost:5000/api/vibration"
SENSOR_CHANNEL = "sensor_updates"
MOTOR_CHANNEL = "control_updates"
RELAY_CHANNEL = "relay_updates"
VOLTAGE_CUTOFF_THRESHOLD = 14.7
charging_enabled = True
current_frequency = 0.0
intended_freq = 0
currentPWM = 0
CSV_REGEX = re.compile(r"^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+,-?\d+(\.\d+)?,-?\d+(\.\d+)?$")
bad_line_count = 0
BAD_LINE_THRESHOLD = 10

NUM_SAMPLES = 128
SAMPLING_RATE_HZ = 140
accel_buffer = []
last_fft_time = time.time()
window = hann(NUM_SAMPLES)
freq_history = deque(maxlen=3)
sample_times = deque(maxlen=NUM_SAMPLES)

motor_command_queue = deque(maxlen=5)
relay_command_queue = deque(maxlen=5)

last_motor_send_time = 0
last_relay_send_time = 0
MOTOR_SEND_INTERVAL = 0.2
RELAY_SEND_INTERVAL = 0.1

def find_arduino_port():
    ports = [port.device for port in serial.tools.list_ports.comports()
             if 'ttyUSB' in port.device or 'ttyACM' in port.device]
    return ports[0] if ports else None

def read_arduino_csv(ser):
    global bad_line_count
    try:
        line = ser.readline().decode("utf-8", errors="ignore").strip()
        if not line or not CSV_REGEX.match(line):
            bad_line_count += 1
            print(f"[Bridge] Skipping malformed line ({bad_line_count}):", repr(line))
            if bad_line_count >= BAD_LINE_THRESHOLD:
                print("[Bridge] Too many malformed lines. Flushing serial input...")
                ser.reset_input_buffer()
                time.sleep(0.05)
                bad_line_count = 0
            return None
        bad_line_count = 0
        parts = line.split(",")
        z, voltage, temp, relay_state, timestamp, freq = map(float, parts)
        return {
            "z": z,
            "voltage": voltage,
            "temperature": temp,
            "relay_state": int(relay_state),
            "timestamp": timestamp,
            "dominantFrequency": freq
        }
    except Exception as e:
        print("[Bridge] Exception in read_arduino_csv:", e)
        return None

def send_data_to_flask(data):
    try:
        response = requests.post(FLASK_URL, json=data)
        print("Data sent to Flask successfully!" if response.status_code == 200 else f"Failed to send data: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

def map_frequency_to_pwm(frequency):
    freq_pwm_map = {
        0: 0, 4: 20, 6: 30, 8: 40, 10: 50, 12: 60, 14: 70, 16.5: 80,
        18.5: 90, 20.5: 100, 23: 110, 25: 120, 26: 130, 29.5: 140,
        31.5: 150, 34.1: 160, 36.1: 170, 38.1: 180, 40.1: 190, 42.1: 200,
        44.1: 210, 46.1: 220, 48.1: 230, 50.1: 240, 52.1: 250
    }
    freqs = sorted(freq_pwm_map.keys())
    for i in range(len(freqs) - 1):
        if freqs[i] <= frequency <= freqs[i + 1]:
            f1, f2 = freqs[i], freqs[i + 1]
            p1, p2 = freq_pwm_map[f1], freq_pwm_map[f2]
            ratio = (frequency - f1) / (f2 - f1)
            return int(p1 + ratio * (p2 - p1))
    return freq_pwm_map[freqs[0]] if frequency <= freqs[0] else freq_pwm_map[freqs[-1]]

def map_band_to_frequency_amplitude(band):
    band = band.lower()
    return (18, 4) if band == "low" else (28, 14) if band == "medium" else (30, 20) if band == "high" else (0, 0)

def process_motor_commands(ser):
    global last_motor_send_time, intended_freq
    current_time = time.time()
    if motor_command_queue and (current_time - last_motor_send_time) > MOTOR_SEND_INTERVAL:
        pwm_value = motor_command_queue.pop()
        try:
            ser.reset_input_buffer()
            ser.write(f"MOTOR:{pwm_value}\n".encode())
            ser.flush()
            time.sleep(0.01)
            last_motor_send_time = current_time
            print(f"Sent Motor Command: PWM {pwm_value}")

            # ✅ Only clear AFTER sending
        except Exception as e:
            print(f"Error sending motor command: {e}")
def process_relay_commands(ser):
    global last_relay_send_time
    current_time = time.time()
    if relay_command_queue and (current_time - last_relay_send_time) > RELAY_SEND_INTERVAL:
        relay_action = relay_command_queue.popleft()
        try:
            ser.reset_input_buffer()
            ser.write(f"RELAY:{relay_action}\n".encode())
            ser.flush()
            time.sleep(0.01)
            last_relay_send_time = current_time
            print(f"Sent Relay Command: {relay_action}")
        except Exception as e:
            print(f"Error sending relay command: {e}")

def arduino_bridge():
    global charging_enabled, current_frequency, currentPWM, intended_freq

    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT)
    motor_pubsub = redis_client.pubsub()
    motor_pubsub.subscribe("control_updates")

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
                    try: ser.close()
                    except: pass
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
                        set_arduino_status({"platform": "Connected", "vibration_sensor": "OK", "temperature_sensor": "OK"})
                    except Exception as e:
                        print(f"[Bridge] Failed to open serial: {e}")
                        set_arduino_status({"platform": "Disconnected", "vibration_sensor": "FAIL", "temperature_sensor": "FAIL"})
                        ser = None
                        time.sleep(3)
                        continue
                else:
                    print("[Bridge] No Arduino found. Retrying in 3 seconds...")
                    set_arduino_status({"platform": "Disconnected", "vibration_sensor": "FAIL", "temperature_sensor": "FAIL"})
                    time.sleep(3)
                    continue

            process_motor_commands(ser)
            process_relay_commands(ser)

            data = read_arduino_csv(ser)
            if data:
                z_val = data["z"]
                accel_buffer.append(z_val)
                current_frequency = data["dominantFrequency"]
                formatted_data = {
                    "frequency": current_frequency,
                    "intensity": abs(z_val),
                    "temperature": data["temperature"],
                    "voltage": data["voltage"],
                    "relay_status": data["relay_state"],
                    "timestamp": datetime.utcnow().isoformat()
                }
                redis_client.publish(SENSOR_CHANNEL, json.dumps(formatted_data))
                send_data_to_flask(formatted_data)
                print("Published Sensor Data:", formatted_data)

                voltage = data["voltage"]
                if voltage and voltage >= VOLTAGE_CUTOFF_THRESHOLD and charging_enabled:
                    relay_command_queue.append("NEUTRAL")
                    charging_enabled = False

                motor_msg = motor_pubsub.get_message(ignore_subscribe_messages=True, timeout=0.01)
                if motor_msg:
                    try:
                        control_data = json.loads(motor_msg["data"].decode())
                        new_intended_freq = control_data.get("frequency", 0)

                        if new_intended_freq != intended_freq:
                            intended_freq = new_intended_freq

                            pwm = map_frequency_to_pwm(new_intended_freq)
                            if pwm == 0:
                                motor_command_queue.clear()
                                # Send MOTOR:0 three times for redundancy
                                for _ in range(3):
                                    motor_command_queue.appendleft(0)
                                print("[Bridge] Emergency STOP queued (MOTOR:0 x3)")
                            elif not motor_command_queue or motor_command_queue[-1] != pwm:
                                motor_command_queue.append(pwm)
                    except Exception as e:
                        print("Invalid motor command:", e)

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
                                try: ser.close()
                                except: pass
                            ser = None
                            continue
                    except:
                        print("Invalid reconnect command.")

        except (serial.SerialException, OSError) as e:
            print(f"[Bridge] Serial/OSError: {e}")
            if ser:
                try: ser.close()
                except: pass
            set_arduino_status({"platform": "Disconnected", "vibration_sensor": "FAIL", "temperature_sensor": "FAIL"})
            ser = None
            time.sleep(2)

        except Exception as e:
            print("[Bridge] General error:", e)
            set_arduino_status({"platform": "Disconnected", "vibration_sensor": "FAIL", "temperature_sensor": "FAIL"})
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
