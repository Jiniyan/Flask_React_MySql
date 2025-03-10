# simulation_clock.py
import time
import redis
import json
from datetime import datetime

redis_client = redis.Redis()

def tick_simulation_time():
    print("Simulation clock started.")
    
    while True:
        try:
            sim_time = redis_client.get("sim_time")
            sim_time = int(sim_time) if sim_time else 0
            sim_time += 1
            redis_client.set("sim_time", sim_time)

            payload = {
                "sim_time": sim_time,
                "timestamp": datetime.utcnow().isoformat()
            }
            redis_client.publish("simulation_time", json.dumps(payload))
        except Exception as e:
            print("Tick error:", e)

        time.sleep(1)
