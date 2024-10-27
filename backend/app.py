from flask import Flask, send_from_directory, redirect, request
from flask_cors import CORS
from flask_login import LoginManager
from config import Config
from db import db
from models import User, Simulation, SimulationResult, Control, Sensor
from auth import auth
import os
import requests
from routes import reports_bp  # Import the blueprint


app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
app.config.from_object(Config)

app.register_blueprint(reports_bp)  # Register blueprint
# Initialize extensions
CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://127.0.0.1:3000"])
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'


# Register blueprint
app.register_blueprint(auth, url_prefix='/auth')

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Serve React frontend or proxy to React dev server in development mode
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if app.env == "development":
        # Proxy to React development server if it’s running
        url = f'http://localhost:3000/{path}'
        try:
            response = requests.get(url)
            return (response.content, response.status_code, response.headers.items())
        except requests.exceptions.ConnectionError:
            return "React development server is not running.", 500
    else:
        # Serve static files from the React build folder in production mode
        file_path = os.path.join(app.static_folder, path)
        if os.path.exists(file_path):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    if app.env == "development":
        # Redirect to React dev server in development mode
        return redirect("http://localhost:3000/")
    else:
        # Serve index.html in production mode for 404s
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    app.env = "development"
    app.run(debug=True)


    
