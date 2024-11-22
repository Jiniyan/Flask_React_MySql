# Sensor Routes
from flask import Blueprint, jsonify, request
from models import Sensor, Simulation
from db import db
from datetime import datetime

sensor_bp = Blueprint('sensor', __name__)

# Initialize the global variable to store the latest vibration data when no active simulation
latest_vibration_data = {}

# Endpoint to receive vibration data from the sensor and save it
# Updated Sensor Route to append data points
# Updated Sensor Route to append data points and update current_timestamp
# Sensor Routes
from flask import Blueprint, jsonify, request
from models import Sensor, Simulation
from db import db
from datetime import datetime

sensor_bp = Blueprint('sensor', __name__)

# Endpoint to receive vibration data from the sensor and save it
@sensor_bp.route('/api/vibration', methods=['POST'])
def save_vibration_data():
    try:
        data = request.json
    except Exception as e:
        return jsonify({"error": f"Invalid JSON: {str(e)}"}), 400  # Return a 400 error if JSON is invalid

    # Print the received data for debugging
    print("Received data:", data)

    # Check for an active simulation (any ongoing simulation)
    active_simulation = Simulation.query.filter_by(status='ongoing').first()
    if not active_simulation:
        # No active simulation, store data in global cache
        latest_vibration_data.update({
            "current_frequency": data.get("frequency"),
            "current_intensity": data.get("intensity"),
            "timestamp": datetime.utcnow().isoformat()
        })
        return jsonify({"message": "Data saved in cache as no active simulation is present."}), 200

    # Otherwise, save data to the database for the active simulation
    sensor = Sensor.query.filter_by(simulation_id=active_simulation.id).first()
    if not sensor:
        # If no sensor entry exists for the simulation, create one
        sensor = Sensor(
            simulation_id=active_simulation.id,
            current_frequency=data.get("frequency"),
            current_intensity=data.get("intensity"),
            data_points=[{
                "time": datetime.utcnow().isoformat(),
                "frequency": data.get("frequency"),
                "intensity": data.get("intensity")
            }],
            current_timestamp=datetime.utcnow()  # Set the timestamp explicitly on creation
        )
        db.session.add(sensor)
    else:
        # Update existing sensor data and append the new data point to data_points
        sensor.current_frequency = data.get("frequency")
        sensor.current_intensity = data.get("intensity")
        sensor.current_timestamp = datetime.utcnow()  # Update timestamp explicitly

        # Append new data to the data_points list
        new_data_point = {
            "time": datetime.utcnow().isoformat(),
            "frequency": data.get("frequency"),
            "intensity": data.get("intensity")
        }

        # If data_points is None or empty, initialize as an empty list
        if sensor.data_points is None:
            sensor.data_points = []

        # Since data_points is a JSON field (essentially a list in this case), ensure correct append
        if isinstance(sensor.data_points, list):
            updated_data_points = sensor.data_points.copy()  # Explicitly make a copy to avoid mutable issues
            updated_data_points.append(new_data_point)
            sensor.data_points = updated_data_points
        else:
            # If somehow data_points is not a list, reinitialize it to a list with the current data point
            sensor.data_points = [new_data_point]

    # Commit the changes to the database
    db.session.commit()

    return jsonify({"message": "Data saved successfully!", "received_data": data}), 200



# Endpoint to fetch the most recent vibration data
@sensor_bp.route('/api/latest-vibration', methods=['GET'])
def get_latest_vibration_data():
    # Check for an active simulation
    active_simulation = Simulation.query.filter_by(status='ongoing').first()

    if active_simulation:
        # Fetch the corresponding sensor data for the active simulation
        sensor = Sensor.query.filter_by(simulation_id=active_simulation.id).first()
        if sensor:
            # Prepare the data to be returned from the database
            sensor_data = {
                "simulation_id": sensor.simulation_id,
                "current_frequency": sensor.current_frequency,
                "current_intensity": sensor.current_intensity
            }
            return jsonify(sensor_data), 200

    # If no active simulation or no sensor data is found, return the cached data
    if not latest_vibration_data:
        return jsonify({"error": "No cached vibration data available"}), 404
    return jsonify(latest_vibration_data), 200
