# simulation_results_routes.py
from flask import Blueprint, jsonify, request
from models import SimulationResult
from db import db

simulation_results_bp = Blueprint('simulation_results', __name__)

# Endpoint to fetch simulation reports
@simulation_results_bp.route('/api/simulation-reports/', methods=['GET'])
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
