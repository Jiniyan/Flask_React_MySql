# auth.py
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, login_required, logout_user, current_user
from flask_cors import cross_origin  # Import cross_origin
from db import db
from models import User

auth = Blueprint('auth', __name__)

@auth.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    hashed_password = generate_password_hash(password, method='sha256')
    new_user = User(username=username, email=email, password=hashed_password)

    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User created successfully!"}), 201
    except:
        return jsonify({"error": "User already exists!"}), 409

@auth.route('/login', methods=['POST'])
@cross_origin(origin='http://localhost:3000', supports_credentials=True)
def login():
    data = request.json
    identifier = data.get('identifier')  # Username or email
    password = data.get('password')

    # Try to find the user by either username or email
    user = User.query.filter((User.username == identifier) | (User.email == identifier)).first()
    
    if user:
        print(f"User found: {user.username}")
        if check_password_hash(user.password, password):
            print("Password match!")
            login_user(user)
            return jsonify({"key": "your_token_here"}), 200  # Replace with actual token logic
        else:
            print(user.password)
            print(password)
            print("Password does not match.")
    else:
        print("User not found.")

    return jsonify({"error": "Invalid username/email or password."}), 401

    

@auth.route('/dashboard')
@login_required
def dashboard():
    return jsonify({"message": f"Welcome, {current_user.username}!"})

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out successfully!"})
