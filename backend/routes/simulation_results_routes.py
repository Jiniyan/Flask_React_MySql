# simulation_results_routes.py
from flask_login import login_required, current_user

from flask import Blueprint, jsonify, request
from models import SimulationResult
from db import db
from pytz import timezone
ph_tz = timezone("Asia/Manila")
simulation_results_bp = Blueprint('simulation_results', __name__)

# Endpoint to fetch simulation reports
@simulation_results_bp.route('/api/simulation-reports/', methods=['GET'])
@login_required
def get_simulation_reports():
    page = request.args.get('page', 1, type=int)
    per_page = 10
    sort = request.args.get('sort', 'id')  # default sort field
    order = request.args.get('order', 'asc')  # 'asc' or 'desc'

    # Base query
    query = SimulationResult.query.filter_by(user_id=current_user.id)
    # Sort by first data_point timestamp (if stored in JSON), otherwise by created_at
    if sort == 'timestamp':
        # Assuming you're storing the first timestamp in created_at or a custom column
        sort_attr = SimulationResult.created_at
    else:
        sort_attr = getattr(SimulationResult, sort, SimulationResult.id)

    if order == 'desc':
        query = query.order_by(sort_attr.desc())
    else:
        query = query.order_by(sort_attr.asc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    reports = pagination.items

    results = [{
        "id": report.simulation_id,
        "frequency": report.frequency,
        "intensity": report.intensity,
        "duration": report.duration,
        "vibration_level": report.vibration_level,
        "created_at": report.created_at,
        "data_points": report.data_points,
        "battery_status": report.simulation.battery_status if report.simulation else None
    } for report in reports]

    return jsonify({
        "results": results,
        "next": pagination.has_next,
        "previous": pagination.has_prev,
        "page": page
    })
