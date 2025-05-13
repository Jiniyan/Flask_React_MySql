import serial
import serial.tools.list_ports
import redis
import time
import json
import threading

# === CONFIG ===
BAUDRATE = 115200
SERIAL_TIMEOUT = 0.05
REDIS_HOST = "localhost"
REDIS_PORT = 6379
SERIAL_CHANNEL = "arduino_queue"
MOTOR_CHANNEL = "control_updates"
RELAY_CHANNEL = "relay_updates"

# === SERIAL SETUP ===
def find_arduino_port():
    ports = [port.device for port in serial.tools.list_ports.comports() if 'ttyUSB' in port.device or 'ttyACM' in port.device]
    return ports[0] if ports else None

def connect_redis():
    while True:
        try:
            client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
            client.ping()
            print("Connected to Redis.")
            return client
        except Exception as e:
            print(f"Redis connection failed: {e}. Retrying in 2s...")
            time.sleep(2)

redis_client = connect_redis()
ser = None

# === Pub/Sub Command Processor ===
def pubsub_command_listener():
    pubsub = redis_client.pubsub()
    pubsub.subscribe(MOTOR_CHANNEL, RELAY_CHANNEL)
    print("[Serial Reader] Subscribed to motor and relay channels.")

    while True:
        message = pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
        if message:
            try:
                data = json.loads(message["data"])
                channel = message["channel"]

                if ser and ser.is_open:
                    if channel == MOTOR_CHANNEL:
                        freq = data.get("frequency", 0)
                        pwm = int(freq) if isinstance(freq, (int, float)) else 0
                        command = f"MOTOR:{pwm}\n"
                        ser.write(command.encode())
                        print("[Serial Writer] Sent to Arduino:", command.strip())

                    elif channel == RELAY_CHANNEL:
                        state = data.get("state", "").upper()
                        if state in ["CHARGE", "DISCHARGE", "NEUTRAL"]:
                            command = f"RELAY:{state}\n"
                            ser.write(command.encode())
                            print("[Serial Writer] Sent to Arduino:", command.strip())

            except Exception as e:
                print("[PubSub Error]", e)
        time.sleep(0.01)

# Start pubsub command listener in a background thread
listener_thread = threading.Thread(target=pubsub_command_listener, daemon=True)
listener_thread.start()

# === Main Serial Reader Loop ===
while True:
    try:
        if ser is None or not ser.is_open:
            port = find_arduino_port()
            if port:
                ser = serial.Serial(port, BAUDRATE, timeout=SERIAL_TIMEOUT)
                ser.reset_input_buffer()
                print(f"Connected to {port}")
            else:
                print("No Arduino found. Retrying...")
                time.sleep(2)
                continue

        line = ser.readline().decode("utf-8", errors="ignore").strip()
        if not line or line.count(',') != 4:
            continue

        parts = line.split(',')
        try:
            z, voltage, temp, relay_state, timestamp = map(float, parts)
            payload = json.dumps({
                "z": z,
                "voltage": voltage,
                "temperature": temp,
                "relay_state": int(relay_state),
                "timestamp": timestamp
            })
            redis_client.rpush(SERIAL_CHANNEL, payload)
        except ValueError:
            continue

    except Exception as e:
        print("Error:", e)
        if ser:
            try:
                ser.close()
            except:
                pass
        ser = None
        time.sleep(2)
