# models.py
from db import db
from flask_login import UserMixin
from datetime import datetime

# User model
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)  # For hashed passwords

    def __repr__(self):
        return f"<User {self.username}>"

# Simulation Model
class Simulation(db.Model):
    __tablename__ = 'simulations'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # Foreign key to users table
    status = db.Column(db.String(100), nullable=False)  # Status of the simulation
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # Timestamp for creation

    # Relationships
    user = db.relationship('User', backref=db.backref('simulations', lazy=True))

    def __repr__(self):
        return f"<Simulation {self.id} - User {self.user_id} - Status {self.status}>"

# SimulationResult Model
class SimulationResult(db.Model):
    __tablename__ = 'simulation_results'
    id = db.Column(db.Integer, primary_key=True)
    simulation_id = db.Column(db.Integer, db.ForeignKey('simulations.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    data_points = db.Column(db.JSON)  # JSON field for data points
    frequency = db.Column(db.Float, nullable=False)
    intensity = db.Column(db.Float, nullable=False)
    duration = db.Column(db.Float, nullable=False)
    vibration_level = db.Column(db.String(2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    simulation = db.relationship('Simulation', backref=db.backref('results', lazy=True))
    user = db.relationship('User', backref=db.backref('simulation_results', lazy=True))

    def __repr__(self):
        return f"<SimulationResult {self.id} - Simulation {self.simulation_id} - Vibration Level {self.vibration_level}>"

# Control Model
class Control(db.Model):
    __tablename__ = 'controls'
    id = db.Column(db.Integer, primary_key=True)
    simulation_id = db.Column(db.Integer, db.ForeignKey('simulations.id'), nullable=False)
    data_points = db.Column(db.JSON)  # JSON field for control data points
    frequency = db.Column(db.Float, nullable=False)
    intensity = db.Column(db.Float, nullable=False)
    duration = db.Column(db.Float, nullable=False)
    vibration_level = db.Column(db.String(2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    simulation = db.relationship('Simulation', backref=db.backref('controls', lazy=True))

    def __repr__(self):
        return f"<Control {self.id} - Simulation {self.simulation_id}>"

# Sensor Model
class Sensor(db.Model):
    __tablename__ = 'sensors'
    id = db.Column(db.Integer, primary_key=True)
    simulation_id = db.Column(db.Integer, db.ForeignKey('simulations.id'), nullable=False)
    data_points = db.Column(db.JSON)  # JSON field for sensor data points
    frequency = db.Column(db.Float, nullable=False)
    intensity = db.Column(db.Float, nullable=False)
    duration = db.Column(db.Float, nullable=False)
    vibration_level = db.Column(db.String(2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    simulation = db.relationship('Simulation', backref=db.backref('sensors', lazy=True))

    def __repr__(self):
        return f"<Sensor {self.id} - Simulation {self.simulation_id} - Vibration Level {self.vibration_level}>"
