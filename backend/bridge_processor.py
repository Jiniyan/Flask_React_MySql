import redis
import json
import numpy as np
from scipy.signal import welch, find_peaks
from scipy.signal.windows import hann

from datetime import datetime
import requests
import time
from collections import deque
import threading

# === Redis Config ===
REDIS_HOST = "localhost"
REDIS_PORT = 6379
DATA_QUEUE = "arduino_queue"
SENSOR_CHANNEL = "sensor_updates"
MOTOR_CHANNEL = "control_updates"
RELAY_CHANNEL = "relay_updates"
FLASK_URL = "http://localhost:5000/api/vibration"

# === Sampling and FFT Config ===
NUM_SAMPLES = 256
SAMPLING_RATE_HZ = 201.25
FREQ_UPDATE_INTERVAL = 0.25
VOLTAGE_CUTOFF_THRESHOLD = 14.7

accel_buffer = []
last_fft_time = time.time()
current_frequency = 0.0
charging_enabled = True

# === Redis Setup ===
def connect_redis():
    while True:
        try:
            client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
            client.ping()
            print("Connected to Redis.")
            return client
        except Exception as e:
            print(f"[Bridge Processor] Redis connection failed: {e}. Retrying...")
            time.sleep(2)

r = connect_redis()

# Redis watchdog to maintain connection awareness
def redis_watchdog():
    while True:
        try:
            r.ping()
            print("[Redis Watchdog] Ping successful. Queue Length:", r.llen(DATA_QUEUE))
        except Exception as e:
            print(f"[Redis Watchdog] Redis disconnected: {e}")
        time.sleep(30)

watchdog_thread = threading.Thread(target=redis_watchdog, daemon=True)
watchdog_thread.start()

pubsub = r.pubsub()
pubsub.subscribe(MOTOR_CHANNEL, RELAY_CHANNEL)
freq_history = deque(maxlen=5)

# === Frequency Calibration Function ===
def calibrate_frequency(raw_freq):
    return 0.0002 * raw_freq**2 + 0.4353 * raw_freq - 0.0995

# === Frequency to PWM Mapping ===
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

# === Harmonic Penalty Function ===
def apply_harmonic_penalty(freqs, psd, max_safe_freq=60):
    penalty = np.ones_like(freqs)
    mask = freqs > max_safe_freq
    if np.any(mask):
        penalty[mask] = 1 - ((freqs[mask] - max_safe_freq) / (freqs[-1] - max_safe_freq)) ** 2
    return psd * penalty

# === Frequency Estimation ===
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
    bias_window = np.exp(np.linspace(0, -4, NUM_SAMPLES))
    hybrid_window = hann_window * bias_window
    windowed = accel_array * hybrid_window

    freqs, psd = welch(windowed, fs=fs, nperseg=NUM_SAMPLES)
    valid = (freqs >= 2) & (freqs <= 60)
    freqs, psd = freqs[valid], psd[valid]

    if len(psd) == 0:
        return 0.0

    psd = apply_harmonic_penalty(freqs, psd)
    peaks, props = find_peaks(psd, height=0.00005)
    if len(peaks) == 0:
        return 0.0

    peak_heights = props["peak_heights"]
    max_idx = np.argmax(peak_heights)
    fundamental_freq = freqs[peaks[max_idx]]

    if last_freq is not None:
        closest_peak = min(peaks, key=lambda i: abs(freqs[i] - last_freq))
        return freqs[closest_peak]

    return fundamental_freq

# === Main Processing Loop ===
print("Bridge Processor Started. Waiting for data...")

while True:
    for _ in range(10):
        packed = r.lpop(DATA_QUEUE)
        if not packed:
            break

    else:
        try:
            data = json.loads(packed)
            z_val = data["z"]
            accel_buffer.append(z_val)
            if len(accel_buffer) > NUM_SAMPLES:
                accel_buffer.pop(0)

            current_time = time.time()
            buffer_fill_ratio = len(accel_buffer) / NUM_SAMPLES
            if buffer_fill_ratio >= 0.5 and (current_time - last_fft_time) >= FREQ_UPDATE_INTERVAL:
                freq_estimate = estimate_frequency_psd(accel_buffer, SAMPLING_RATE_HZ)
                alpha = 0.05
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

            r.publish(SENSOR_CHANNEL, json.dumps(formatted_data))
            requests.post(FLASK_URL, json=formatted_data)

            if formatted_data["voltage"] >= VOLTAGE_CUTOFF_THRESHOLD and charging_enabled:
                r.publish(RELAY_CHANNEL, json.dumps({"state": "NEUTRAL"}))
                charging_enabled = False

        except Exception as e:
            print("[Processor Error]", e)
            continue

    # === Process ALL incoming control/relay commands ===
    while True:
        message = pubsub.get_message(ignore_subscribe_messages=True, timeout=0.01)
        if message is None:
            break
        try:
            data = json.loads(message["data"])
            channel = message["channel"]

            if channel == MOTOR_CHANNEL:
                frequency = data.get("frequency", 0)
                pwm = map_frequency_to_pwm(frequency)
                print(f"[Bridge] Motor Command: {frequency} Hz → PWM {pwm}")

            elif channel == RELAY_CHANNEL:
                state = data.get("state", "").upper()
                if state in ["CHARGE", "DISCHARGE", "NEUTRAL"]:
                    print(f"[Bridge] Relay Command Received: {state}")

        except Exception as e:
            print("[Bridge] Failed to process control message:", e)
