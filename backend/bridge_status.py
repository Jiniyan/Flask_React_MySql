import redis
import json

redis_client = redis.Redis()

STATUS_KEY = "arduino_connection_status"

def set_arduino_status(status):
    redis_client.set(STATUS_KEY, json.dumps(status))

def get_arduino_status():
    status = redis_client.get(STATUS_KEY)
    if status:
        return json.loads(status)
    return {
        "platform": "Disconnected",
        "vibration_sensor": "Unknown",
        "temperature_sensor": "Unknown"
    }

def trigger_reconnect():
    redis_client.publish("arduino_commands", json.dumps({"action": "reconnect"}))
