# auth.py
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, login_required, logout_user, current_user
from flask_cors import cross_origin  # Import cross_origin
from db import db
from models import User
from flask import session, make_response

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
def login():
    data = request.json
    identifier = data.get('identifier')
    password = data.get('password')

    user = User.query.filter((User.username == identifier) | (User.email == identifier)).first()
    
    if user and check_password_hash(user.password, password):
        login_user(user)
        
        # 🧠 Debug print
        print(f"[DEBUG] Current user authenticated: {current_user.is_authenticated}")
        print(f"[DEBUG] Flask session contents: {dict(session)}")
        
        return jsonify({"message": "Login successful"}), 200

    return jsonify({"error": "Invalid username/email or password."}), 401

@auth.route('/dashboard')
@login_required
def dashboard():
    return jsonify({"message": f"Welcome, {current_user.username}!"})

@auth.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    session.clear()

    response = make_response(jsonify({"message": "Logged out successfully"}))
    response.set_cookie('session', '', expires=0, path='/', httponly=True, samesite='Lax')
    return response

@auth.route('/status')
def status():
    if current_user.is_authenticated:
        return jsonify({"logged_in": True, "username": current_user.username})
    return jsonify({"logged_in": False})
