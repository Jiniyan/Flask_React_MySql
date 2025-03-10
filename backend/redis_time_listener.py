import threading
import redis
import json

redis_client = redis.Redis()
_listener_started = False  # singleton guard

def start_redis_time_listener(socketio_instance):
    global _listener_started
    if _listener_started:
        print("⚠️ Redis listener already running.")
        return
    _listener_started = True

    def listen_and_emit_sim_time():
        pubsub = redis_client.pubsub()
        pubsub.subscribe("simulation_time")
        print("✅ Subscribed to Redis channel: simulation_time")

        for message in pubsub.listen():
            if message and message.get("type") == "message":
                try:
                    data = json.loads(message["data"].decode())
                    print("📢 Emitting sim_time_tick:", data)
                    socketio_instance.emit("sim_time_tick", data, namespace="/", to=None)
                except Exception as e:
                    print("❌ Redis Listener Error:", e)

    threading.Thread(target=listen_and_emit_sim_time, daemon=True).start()
    print("✅ Redis time listener thread started.")
