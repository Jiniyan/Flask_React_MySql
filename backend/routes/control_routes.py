import redis
import json  # Import json for serialization
from flask import Blueprint, jsonify, request
from models import Control, Simulation
from db import db
from datetime import datetime, timedelta

# Initialize Redis client
redis_client = redis.Redis()

control_bp = Blueprint('control', __name__)

@control_bp.route('/api/control/update', methods=['POST'])
def update_control_data():
    """
    Update control data for an ongoing simulation and send it via Redis Pub/Sub.
    """
    data = request.get_json()
    simulation_id = data.get('simulation_id')

    if not simulation_id:
        return jsonify({'error': 'Simulation ID is required'}), 400

    # Fetch the control data for the specified simulation ID
    control = Control.query.filter_by(simulation_id=simulation_id).first()
    if not control:
        return jsonify({'error': 'Control data not found'}), 404

    # Update fields only if they are provided
    if "frequency" in data:
        control.current_frequency = data['frequency']
    if "intensity" in data:
        control.current_intensity = data['intensity']
    if "duration" in data:
        control.current_duration = data['duration']
        # Update the end time of the simulation as well
        new_end_time = datetime.utcnow() + timedelta(minutes=data['duration'])
        simulation = Simulation.query.get(simulation_id)
        if simulation:
            simulation.end_time = new_end_time

    # Append the new data to the data_points column
    new_data_point = {
        "time": datetime.utcnow().isoformat(),
        "frequency": control.current_frequency,
        "intensity": control.current_intensity,
        "duration": control.current_duration
    }

    if not control.data_points:
        control.data_points = []
    control.data_points.append(new_data_point)

    # Commit the changes to the database
    db.session.commit()

    # Prepare the control data and serialize it to JSON
    control_data = {
        "simulation_id": simulation_id,
        "frequency": control.current_frequency,
        "intensity": control.current_intensity,
        "duration": control.current_duration
    }

    # Convert the control data to a JSON string before publishing
    control_data_json = json.dumps(control_data)

    # Publish updated control data to Redis channel
    redis_client.publish("control_updates", control_data_json)  # Publish to Redis channel
    print("Published control data to Redis:", control_data_json)

    return jsonify({'message': 'Control data updated successfully'}), 200

@control_bp.route('/api/control/parameters/<int:simulation_id>', methods=['GET'])
def get_control_parameters(simulation_id):
    """
    Fetch the control parameters (frequency and intensity) for the given simulation ID.
    """
    control = Control.query.filter_by(simulation_id=simulation_id).first()
    if not control:
        return jsonify({'error': 'Control data not found'}), 404

    return jsonify({
        'frequency': control.current_frequency,
        'intensity': control.current_intensity,
        'duration': control.current_duration
    }), 200
