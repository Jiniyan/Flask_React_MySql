from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from flask_login import LoginManager, login_required, logout_user
from flask_migrate import Migrate
from config import Config
from db import db
from models import User, Simulation, SimulationResult, Control, Sensor
from auth import auth
from routes.sensor_routes import sensor_bp
from routes.simulation_results_routes import simulation_results_bp
from routes.control_routes import control_bp
from routes.simulation_routes import simulation_bp
from scheduler import init_scheduler
from arduino_bridge import start_arduino_bridge
from flask_session import Session
from routes.user_routes import user_bp  # <- ADD THIS
from datetime import timedelta
from flask_login import LoginManager

app = Flask(__name__, static_folder='build', static_url_path='/')  # Point to your React build directory
app.secret_key = "thenapoleonofcrime-secret"
app.config.from_object(Config)
app.config['SESSION_TYPE'] = 'filesystem'  # For now, store sessions on disk
app.config['SESSION_USE_SIGNER'] = True  # Optional: adds extra security
app.config['SESSION_FILE_DIR'] = './flask_session/'  # Optional: specify session directory
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False  # Set to True in production with HTTPS
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=60)
# Initialize CORS to allow requests from specific origins
CORS(app, supports_credentials=True, origins=[
    "http://localhost:3000", "http://127.0.0.1:3000", "http://127.0.0.1:5000", "YOUR_NGROK_URL"
])
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
# Initialize the database
db.init_app(app)
Session(app)
# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

# Register blueprints
app.register_blueprint(auth, url_prefix='/auth')
app.register_blueprint(simulation_bp)
app.register_blueprint(sensor_bp)
app.register_blueprint(simulation_results_bp)
app.register_blueprint(control_bp)
app.register_blueprint(user_bp)  # ✅ Mount the user blueprint (no prefix needed)

# Initialize Flask-Migrate
migrate = Migrate(app, db)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path == '':
        return send_from_directory(app.static_folder, 'index.html')
    return send_from_directory(app.static_folder, path)

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')
@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "Unauthorized"}), 401


if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create database tables if they don't exist

    # Initialize and start the scheduler
    init_scheduler(app)
    start_arduino_bridge()
    # Run the Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)
