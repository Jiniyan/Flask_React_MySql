from flask_login import current_user, login_required
from flask import Blueprint, jsonify

user_bp = Blueprint('user', __name__)

@user_bp.route('/api/current-user', methods=['GET'])
@login_required
def get_current_user():
    print("current user:")
    print(current_user.id)
    return jsonify({
        "user_id": current_user.id,   # 👈 Provide ID
        "username": current_user.username,  # Optional
    }), 200
