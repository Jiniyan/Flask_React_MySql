import serial
import serial.tools.list_ports
import redis
import json
import time
import requests
from datetime import datetime
from collections import deque
import threading

# CONFIGURATION
BAUDRATE = 115200
SERIAL_TIMEOUT = 0.1
REDIS_HOST = "localhost"
REDIS_PORT = 6379
FLASK_URL = "http://localhost:5000/api/vibration"
SENSOR_CHANNEL = "sensor_updates"
MOTOR_CHANNEL = "control_updates"
RELAY_CHANNEL = "relay_updates"

# Command queues for motor and relay
motor_command_queue = deque(maxlen=5)
relay_command_queue = deque(maxlen=5)

# Rate limiting
last_motor_send_time = 0
last_relay_send_time = 0
MOTOR_SEND_INTERVAL = 0.1
RELAY_SEND_INTERVAL = 0.1

def find_arduino_port():
    """Automatically find Arduino serial port."""
    ports = [port.device for port in serial.tools.list_ports.comports()
             if 'ttyUSB' in port.device or 'ttyACM' in port.device]
    if not ports:
        print("No Arduino found.")
        return None
    return ports[0]

def read_arduino_json(ser):
    """Read and parse JSON data from Arduino."""
    try:
        line = ser.readline().decode("utf-8", errors="ignore").strip()
        if line.startswith("{") and line.endswith("}"):
            return json.loads(line)
    except json.JSONDecodeError:
        print("Invalid JSON received:", line)
    except Exception as e:
        print("Serial Read Error:", e)
    return None

def send_data_to_flask(data):
    """Send formatted sensor data to Flask API."""
    try:
        response = requests.post(FLASK_URL, json=data)
        if response.status_code == 200:
            print("Data sent to Flask successfully!")
        else:
            print(f"Failed to send data to Flask: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

def map_intensity_to_pwm(intensity):
    """Convert intensity (0-100%) to PWM duty cycle (0-255)."""
    return int(min(max((intensity / 100) * 255, 0), 255))

def process_motor_commands(ser):
    """Process queued motor commands with rate limiting."""
    global last_motor_send_time
    current_time = time.time()

    if motor_command_queue and (current_time - last_motor_send_time) > MOTOR_SEND_INTERVAL:
        pwm_value = motor_command_queue.popleft()
        ser.write(f"MOTOR:{pwm_value}\n".encode())
        ser.flush()
        last_motor_send_time = current_time
        print(f"Sent Motor Command: PWM {pwm_value}")

def process_relay_commands(ser):
    """Process queued relay commands with rate limiting."""
    global last_relay_send_time
    current_time = time.time()

    if relay_command_queue and (current_time - last_relay_send_time) > RELAY_SEND_INTERVAL:
        relay_action = relay_command_queue.popleft()
        ser.write(f"RELAY:{relay_action}\n".encode())
        ser.flush()
        last_relay_send_time = current_time
        print(f"Sent Relay Command: {relay_action}")

def arduino_bridge():
    """Main function to run Arduino bridge in a separate thread."""
    arduino_port = find_arduino_port()
    if not arduino_port:
        return

    print(f"Connecting to Arduino on {arduino_port}...")
    ser = serial.Serial(arduino_port, BAUDRATE, timeout=SERIAL_TIMEOUT)
    time.sleep(2)
    ser.reset_input_buffer()

    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT)
    motor_pubsub = redis_client.pubsub()
    motor_pubsub.subscribe(MOTOR_CHANNEL)

    relay_pubsub = redis_client.pubsub()
    relay_pubsub.subscribe(RELAY_CHANNEL)

    print("Arduino bridge started. Press Ctrl+C to exit.")

    while True:
        try:
            # Read sensor data and send to Flask
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

            # Queue motor commands
            motor_message = motor_pubsub.get_message(ignore_subscribe_messages=True, timeout=0.05)
            if motor_message:
                try:
                    control_data = json.loads(motor_message["data"].decode())
                    intensity = control_data.get("intensity", 0)
                    pwm_value = map_intensity_to_pwm(intensity)
                    if not motor_command_queue or motor_command_queue[-1] != pwm_value:
                        motor_command_queue.append(pwm_value)
                except json.JSONDecodeError:
                    print("Invalid JSON received in motor command.")

            # Queue relay commands
            relay_message = relay_pubsub.get_message(ignore_subscribe_messages=True, timeout=0.05)
            if relay_message:
                try:
                    relay_data = json.loads(relay_message["data"].decode())
                    relay_action = relay_data.get("state", "").upper()
                    if relay_action in ["CHARGE", "DISCHARGE", "NEUTRAL"]:
                        if not relay_command_queue or relay_command_queue[-1] != relay_action:
                            relay_command_queue.append(relay_action)
                except json.JSONDecodeError:
                    print("Invalid JSON received in relay command.")

            # Process command queues
            process_motor_commands(ser)
            process_relay_commands(ser)

        except Exception as e:
            print("Error:", e)

        time.sleep(0.02)

# Run the Arduino bridge in a background thread
def start_arduino_bridge():
    thread = threading.Thread(target=arduino_bridge, daemon=True)
    thread.start()
    print("Arduino bridge running in background.")
