from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from flask_login import LoginManager
from flask_migrate import Migrate
from config import Config
from db import db
from models import User, Simulation, SimulationResult, Control, Sensor
from auth import auth
import os
from routes import reports_bp  # Import the blueprint

app = Flask(__name__, static_folder='build', static_url_path='/')  # Point to your React build directory
app.config.from_object(Config)

# Initialize CORS to allow requests from specific origins
CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://127.0.0.1:3000", "YOUR_NGROK_URL"])  # Replace YOUR_NGROK_URL with your actual ngrok URL if needed

# Initialize the database
db.init_app(app)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

# Register blueprints
app.register_blueprint(auth, url_prefix='/auth')
app.register_blueprint(reports_bp)  # Register blueprint for reports

# Initialize Flask-Migrate
migrate = Migrate(app, db)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Serve the React frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    # Serve index.html for the root path
    if path == '':
        return send_from_directory(app.static_folder, 'index.html')
    # Serve other static files
    return send_from_directory(app.static_folder, path)

@app.errorhandler(404)
def not_found(e):
    # Serve index.html in production mode for 404s
    return send_from_directory(app.static_folder, 'index.html')

# Example POST route for authentication (modify as needed)
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    # Implement your login logic here
    user = User.query.filter_by(username=username).first()
    if user and user.verify_password(password):  # Make sure you have a method to verify password
        # Logic for successful login (e.g., generate a token, start a session, etc.)
        return jsonify({"message": "Login successful!"}), 200
    return jsonify({"error": "Invalid credentials"}), 401

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create database tables if they don't exist

    app.env = os.getenv('FLASK_ENV', 'development')  # Set the environment mode
    app.run(host='0.0.0.0', port=5000, debug=True)  # Ensure it's accessible on your network
