from db import db
from flask_login import UserMixin
from datetime import datetime, timedelta
from pytz import timezone

ph_tz = timezone("Asia/Manila")

def now_ph():
    return datetime.now(ph_tz)

# User model
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

    def __repr__(self):
        return f"<User {self.username}>"

# Simulation model
class Simulation(db.Model):
    __tablename__ = 'simulations'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='ongoing')
    duration = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=now_ph)
    end_time = db.Column(db.DateTime, nullable=True)
    report_generated = db.Column(db.Boolean, default=False)
    start_voltage = db.Column(db.Float)
    end_voltage = db.Column(db.Float)
    voltage_drop = db.Column(db.Float)
    discharge_started = db.Column(db.Boolean, default=False)
    battery_status = db.Column(db.String(20))

    user = db.relationship('User', backref=db.backref('simulations', lazy=True, cascade="all, delete-orphan"))
    sensors = db.relationship('Sensor', backref='simulation', lazy=True, cascade="all, delete-orphan", passive_deletes=True)
    controls = db.relationship('Control', backref='simulation', lazy=True, cascade="all, delete-orphan", passive_deletes=True)
    results = db.relationship('SimulationResult', backref='simulation', lazy=True, cascade="all, delete-orphan", passive_deletes=True)

    def __repr__(self):
        return f"<Simulation {self.id} - User {self.user_id} - Status {self.status}>"

# SimulationResult model
class SimulationResult(db.Model):
    __tablename__ = 'simulation_results'
    id = db.Column(db.Integer, primary_key=True)
    simulation_id = db.Column(db.Integer, db.ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    data_points = db.Column(db.JSON)
    frequency = db.Column(db.Float, nullable=False)
    intensity = db.Column(db.Float, nullable=False)
    duration = db.Column(db.String(50), nullable=False)
    vibration_level = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=now_ph)

    def __repr__(self):
        return f"<SimulationResult {self.id} - Simulation {self.simulation_id} - Vibration Level {self.vibration_level}>"

# Control model
class Control(db.Model):
    __tablename__ = 'controls'
    id = db.Column(db.Integer, primary_key=True)
    simulation_id = db.Column(db.Integer, db.ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False)
    data_points = db.Column(db.JSON)
    current_frequency = db.Column(db.Float, nullable=False, default=0.0)
    current_intensity = db.Column(db.Float, nullable=False, default=0.0)
    current_duration = db.Column(db.Float, nullable=False, default=0.0)
    vibration_level = db.Column(db.String(20), nullable=False, default="custom")
    created_at = db.Column(db.DateTime, default=now_ph)

    def __repr__(self):
        return f"<Control {self.id} - Simulation {self.simulation_id} - Vibration Level {self.vibration_level}>"

# Sensor model
class Sensor(db.Model):
    __tablename__ = 'sensors'
    id = db.Column(db.Integer, primary_key=True)
    simulation_id = db.Column(db.Integer, db.ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False)

    data_points = db.Column(db.JSON, nullable=True)
    current_frequency = db.Column(db.Float, nullable=False)
    current_intensity = db.Column(db.Float, nullable=False)
    current_timestamp = db.Column(db.DateTime, default=now_ph)
    temperature = db.Column(db.Float, nullable=True)
    voltage = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=now_ph)

    def __repr__(self):
        return f"<Sensor {self.id} - Simulation {self.simulation_id} - Frequency {self.current_frequency}>"
