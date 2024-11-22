# routes.py
from flask import Blueprint, jsonify, request
from models import SimulationResult, Sensor
from db import db

reports_bp = Blueprint('reports', __name__)

# Existing endpoint to fetch simulation reports
@reports_bp.route('/api/simulation-reports/', methods=['GET'])
def get_simulation_reports():
    # Pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = 10

    # Query the simulation reports with pagination
    pagination = SimulationResult.query.paginate(page=page, per_page=per_page, error_out=False)
    reports = pagination.items

    # Prepare data to send as JSON
    results = [{
        "id": report.id,
        "frequency": report.frequency,
        "intensity": report.intensity,
        "duration": report.duration,
        "vibration_level": report.vibration_level,
        "data_points": report.data_points
    } for report in reports]

    # Include pagination metadata
    response_data = {
        "results": results,
        "next": pagination.has_next,
        "previous": pagination.has_prev,
        "page": page
    }

    return jsonify(response_data)


# New endpoint to receive vibration data from the sensor and save it
@reports_bp.route('/api/vibration', methods=['POST'])
def save_vibration_data():
    global latest_vibration_data  # Access the global variable

    data = request.json  # Get the data as a JSON object

    # Print the received data for debugging (will show in the server terminal)
    print("Received data:", data)

    # Store the received data in the global variable
    latest_vibration_data = data

    # Return a response with the received data
    return jsonify({
        "message": "Data received successfully!",
        "received_data": latest_vibration_data  # Send the received data back
    }), 200

# Endpoint to fetch the most recent vibration data
@reports_bp.route('/api/latest-vibration', methods=['GET'])
def get_latest_vibration_data():
    # Return the latest vibration data stored in memory
    return jsonify(latest_vibration_data), 200