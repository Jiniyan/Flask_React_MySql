# simulation_routes.py
import redis
from flask import Blueprint, jsonify, request
from models import Simulation, Sensor, Control, SimulationResult, db
from datetime import datetime, timedelta
import requests  # Used to call the report generation endpoint internally
from report_generator import generate_simulation_report  # Import the generate function from report_generator
import json
redis_client = redis.Redis()

simulation_bp = Blueprint('simulation', __name__)

# Route to start a simulation and assign a simulation ID to the user
@simulation_bp.route('/api/start-simulation', methods=['POST'])
def start_simulation():
    data = request.get_json()
    user_id = data.get('user_id')
    frequency = data.get('frequency', 0)
    intensity = data.get('intensity', 0)
    duration = data.get('duration', 0)
    preset = data.get('preset', 'custom')

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    user_active_simulation = Simulation.query.filter_by(user_id=user_id, status='ongoing').first()
    if user_active_simulation:
        return jsonify({"error": "You already have an active simulation.",
                        "simulation_id": user_active_simulation.id}), 403

    # Create a new Simulation instance
    simulation = Simulation(
        user_id=user_id,
        status='ongoing',
        duration=duration,
        end_time=datetime.utcnow() + timedelta(minutes=duration)
    )
    db.session.add(simulation)
    db.session.commit()

    # Create a new Sensor instance
    sensor = Sensor(
        simulation_id=simulation.id,
        current_frequency=frequency,
        current_intensity=intensity,
        data_points=[]
    )

    # Create a new Control instance
    control = Control(
        simulation_id=simulation.id,
        current_frequency=frequency,
        current_intensity=intensity,
        current_duration=duration,
        vibration_level=preset,
        data_points=[]
    )

    # Append initial control data point to the data_points list
    initial_data_point = {
        "time": datetime.utcnow().isoformat(),  # Current timestamp in ISO format
        "frequency": frequency,
        "intensity": intensity,
        "duration": duration
    }
    control.data_points.append(initial_data_point)

    # Add sensor and control to the session and commit
    db.session.add(sensor)
    db.session.add(control)
    db.session.commit()

    # Publish control data to Redis
    control_data = {
        "simulation_id": simulation.id,
        "frequency": frequency,
        "intensity": intensity,
        "duration": duration
    }
    redis_client.publish("control_updates", json.dumps(control_data))  # Publish control data to Redis channel
    print(f"Published control data to Redis: {control_data}")

    return jsonify({
        "message": "Simulation started successfully!",
        "simulation_id": simulation.id
    }), 201


# Route to check simulation status for a user or globally
@simulation_bp.route('/api/simulation-status/<int:user_id>', methods=['GET'])
def check_simulation_status(user_id):
    user_active_simulation = Simulation.query.filter_by(user_id=user_id, status='ongoing').first()
    if user_active_simulation:
        now = datetime.utcnow()
        remaining_time = (user_active_simulation.end_time - now).total_seconds()

        # Check if simulation is complete
        if remaining_time <= 0:
            user_active_simulation.status = 'completed'
            db.session.commit()

            # Generate the report if not already generated
            if not user_active_simulation.report_generated:
                generate_simulation_report(user_active_simulation)

            return jsonify({
                "status": "completed",
                "user_simulation_id": user_active_simulation.id
            }), 200

        return jsonify({
            "user_simulation_id": user_active_simulation.id,
            "status": "ongoing",
            "remaining_time": remaining_time  # Remaining time in seconds
        }), 200

    return jsonify({
        "status": "No active simulations.",
        "can_start": True
    }), 200

# Route to stop a simulation
@simulation_bp.route('/api/stop-simulation', methods=['POST'])
def stop_simulation():
    data = request.get_json()
    simulation_id = data.get('simulation_id')

    simulation = Simulation.query.filter_by(id=simulation_id, status='ongoing').first()
    if not simulation:
        return jsonify({"error": "Simulation not found or already stopped."}), 404

    # Update simulation status to interrupted
    simulation.status = 'interrupted'
    db.session.commit()

    # Publish control data to Redis with 0 frequency and intensity to stop the motor
    control_data = {
        "simulation_id": simulation_id,
        "frequency": 0,
        "intensity": 0,
        "duration": 0  # Duration is not used when stopping, but you can include it if necessary
    }
    redis_client.publish("control_updates", json.dumps(control_data))  # Publish to Redis channel
    print(f"Published stop control data to Redis: {control_data}")

    return jsonify({"message": "Simulation stopped successfully!"}), 200
# Route to generate a report for a simulation (can also be used if needed separately)
@simulation_bp.route('/api/generate-report/<int:simulation_id>', methods=['POST'])
def generate_report(simulation_id):
    """Generate a simulation report for a completed or interrupted simulation based on simulation ID."""

    # Fetch the simulation
    simulation = Simulation.query.get(simulation_id)
    if not simulation:
        return jsonify({"error": "Simulation not found"}), 404

    # Generate the report
    if not simulation.report_generated:
        generate_simulation_report(simulation)
        return jsonify({"message": "Simulation report generated successfully!"}), 201
    else:
        return jsonify({"message": "Report has already been generated for this simulation."}), 200

# Route to get recent simulations for a user
@simulation_bp.route('/api/user/<int:user_id>/recent-simulations', methods=['GET'])
def get_recent_simulations(user_id):
    # Query the most recent three simulations for the given user based on their creation date
    recent_simulations = Simulation.query.filter_by(user_id=user_id).order_by(Simulation.created_at.desc()).limit(3).all()

    # Prepare data to send as JSON
    simulations = [{
        "id": simulation.id,
        "status": simulation.status,
        "created_at": simulation.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        "duration": simulation.duration
    } for simulation in recent_simulations]

    return jsonify(simulations)