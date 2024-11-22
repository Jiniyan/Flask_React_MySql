# extensions.py
from flask_socketio import SocketIO

# Initialize SocketIO instance
socketio = SocketIO(cors_allowed_origins="*", logger=True, engineio_logger=True)

