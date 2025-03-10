from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from flask_login import LoginManager
from flask_migrate import Migrate
from config import Config
from db import db
from models import User
from auth import auth
from routes.sensor_routes import sensor_bp
from routes.simulation_results_routes import simulation_results_bp
from routes.control_routes import control_bp
from routes.simulation_routes import simulation_bp
from scheduler import init_scheduler
from arduino_bridge import start_arduino_bridge
from simulation_clock import tick_simulation_time
from flask_socketio import SocketIO
from redis_time_listener import start_redis_time_listener
import threading
from datetime import datetime

# --- Initialization ---
app = Flask(__name__, static_folder='build', static_url_path='/')
app.config.from_object(Config)

# ✅ CORS and SocketIO (only once!)
CORS(app, supports_credentials=True, origins=[
    "http://localhost:3000", "http://127.0.0.1:3000"
])
socketio = SocketIO(app,
    cors_allowed_origins=[
        "http://localhost:3000", "http://127.0.0.1:3000","http://localhost:5000"
    ],
    async_mode='threading',
    ping_interval=10,     # seconds between pings (default 25)
    ping_timeout=20,      # time to wait for pong before disconnect (default 60)
)

# ✅ Attach Redis listener to THIS socketio instance
start_redis_time_listener(socketio)

# --- Init DB, Auth, Migrate ---
db.init_app(app)
migrate = Migrate(app, db)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

# --- Register Blueprints ---
app.register_blueprint(auth, url_prefix='/auth')
app.register_blueprint(simulation_bp)
app.register_blueprint(sensor_bp)
app.register_blueprint(simulation_results_bp)
app.register_blueprint(control_bp)

# --- SPA Catch-All for React Router ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path == '':
        return send_from_directory(app.static_folder, 'index.html')
    return send_from_directory(app.static_folder, path)

# ✅ Manual test emit to confirm WebSocket listener
@app.route("/test-emit")
def test_emit():
    data = {"sim_time": 9999, "timestamp": datetime.utcnow().isoformat()}
    print("📢 Emitting sim_time_tick:", data)
    socketio.emit("sim_time_tick", data, namespace="/")
    return jsonify({"message": "Test tick sent"})

# ✅ Optional: catch all 404s
@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')

# --- WebSocket Debug Hook ---
@socketio.on('connect')
def on_connect():
    print("🧠 Client connected via WebSocket.")

# --- Login user loader ---
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- Entry Point ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()

    # ✅ Background processes
    threading.Thread(target=tick_simulation_time, daemon=True).start()
    init_scheduler(app)
    start_arduino_bridge()

    # ✅ Run with the correct socketio instance
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
