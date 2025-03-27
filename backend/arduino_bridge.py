import serial
import serial.tools.list_ports
import redis
import json
import time
import requests
from datetime import datetime
from collections import deque
import threading
import traceback

# CONFIGURATION
BAUDRATE = 115200
SERIAL_TIMEOUT = 0.1
REDIS_HOST = "localhost"
REDIS_PORT = 6379
FLASK_URL = "http://localhost:5000/api/vibration"
SENSOR_CHANNEL = "sensor_updates"
MOTOR_CHANNEL = "control_updates"
RELAY_CHANNEL = "relay_updates"
VOLTAGE_CUTOFF_THRESHOLD = 12.0
charging_enabled = True  # Adjust based on your battery chemistry

# Command queues for motor and relay
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


def read_arduino_json(ser):
    """Read and parse JSON data from Arduino."""
    line = ser.readline().decode("utf-8", errors="ignore").strip()

    if line.startswith("{") and line.endswith("}"):
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            print("Invalid JSON received:", line)

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


def map_intensity_to_pwm(intensity):
    return int(min(max((intensity / 100) * 255, 0), 255))


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
    global charging_enabled

    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT)
    motor_pubsub = redis_client.pubsub()
    motor_pubsub.subscribe(MOTOR_CHANNEL)

    relay_pubsub = redis_client.pubsub()
    relay_pubsub.subscribe(RELAY_CHANNEL)

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
                    except Exception as e:
                        print(f"[Bridge] Failed to open serial: {e}")
                        ser = None
                        time.sleep(3)
                        continue
                else:
                    print("[Bridge] No Arduino found. Retrying in 3 seconds...")
                    time.sleep(3)
                    continue

            if ser and not ser.is_open:
                print("[Bridge] Serial marked open, but isn't. Resetting...")
                try:
                    ser.close()
                except:
                    pass
                ser = None
                time.sleep(1)
                continue

            data = read_arduino_json(ser)
            if data:
                formatted_data = {
                    "frequency": data.get("frequency", 0),
                    "intensity": data.get("intensity", 0),
                    "temperature": data.get("temperature", 0),
                    "voltage": data.get("voltage", 0),
                    "relay_status": data.get("relay_status", "N/A"),
                    "timestamp": datetime.utcnow().isoformat()
                }
                redis_client.publish(SENSOR_CHANNEL, json.dumps(formatted_data))
                send_data_to_flask(formatted_data)
                print("Published Sensor Data:", formatted_data)

                voltage = formatted_data["voltage"]
                if voltage:
                    if voltage >= VOLTAGE_CUTOFF_THRESHOLD and charging_enabled:
                        relay_command_queue.append("NEUTRAL")
                        charging_enabled = False
                    elif voltage <= VOLTAGE_CUTOFF_THRESHOLD - 0.3 and not charging_enabled:
                        relay_command_queue.append("CHARGE")
                        charging_enabled = True

            # Motor control
            motor_msg = motor_pubsub.get_message(ignore_subscribe_messages=True, timeout=0.05)
            if motor_msg:
                try:
                    control_data = json.loads(motor_msg["data"].decode())
                    intensity = control_data.get("intensity", 0)
                    pwm = map_intensity_to_pwm(intensity)
                    if not motor_command_queue or motor_command_queue[-1] != pwm:
                        motor_command_queue.append(pwm)
                except:
                    print("Invalid motor command.")

            # Relay control
            relay_msg = relay_pubsub.get_message(ignore_subscribe_messages=True, timeout=0.05)
            if relay_msg:
                try:
                    relay_data = json.loads(relay_msg["data"].decode())
                    action = relay_data.get("state", "").upper()
                    if action in ["CHARGE", "DISCHARGE", "NEUTRAL"]:
                        if not relay_command_queue or relay_command_queue[-1] != action:
                            relay_command_queue.append(action)
                except:
                    print("Invalid relay command.")

            # Apply commands
            process_motor_commands(ser)
            process_relay_commands(ser)

        except (serial.SerialException, OSError) as e:
            print(f"[Bridge] Serial/OSError: {e}")
            if ser:
                try:
                    ser.close()
                except:
                    pass
            ser = None
            time.sleep(2)

        except Exception as e:
            print("[Bridge] General error:", e)
            raise  # Let safe_arduino_bridge() handle the restart


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
