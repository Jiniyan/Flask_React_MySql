# report_generator.py
from models import Sensor, Control, SimulationResult, db
from datetime import datetime
import statistics

def generate_simulation_report(simulation):
    """Generate a simulation report for a completed or interrupted simulation."""
    # Check if the report is already generated
    if getattr(simulation, 'report_generated', False):
        return

    # Fetch sensor and control data
    sensor = Sensor.query.filter_by(simulation_id=simulation.id).first()
    control = Control.query.filter_by(simulation_id=simulation.id).first()

    # Calculate the actual duration the simulation ran for in seconds
    actual_duration_seconds = (datetime.utcnow() - simulation.created_at).total_seconds()

    # Convert duration to hours, minutes, and seconds
    hours = int(actual_duration_seconds // 3600)
    minutes = int((actual_duration_seconds % 3600) // 60)
    seconds = int(actual_duration_seconds % 60)
    actual_duration_formatted = f"{hours} hr {minutes} min {seconds} sec"

    # Combine data points from control and sensor models
    combined_data_points = []
    if control and control.data_points:
        combined_data_points.extend(control.data_points)
    if sensor and sensor.data_points:
        combined_data_points.extend(sensor.data_points)

    # Calculate average frequency and intensity
    frequencies = [dp['frequency'] for dp in combined_data_points if 'frequency' in dp]
    intensities = [dp['intensity'] for dp in combined_data_points if 'intensity' in dp]

    avg_frequency = statistics.mean(frequencies) if frequencies else 0
    avg_intensity = statistics.mean(intensities) if intensities else 0

    # Create a new SimulationResult entry
    simulation_result = SimulationResult(
        simulation_id=simulation.id,
        user_id=simulation.user_id,
        data_points=combined_data_points,
        frequency=avg_frequency,
        intensity=avg_intensity,
        duration=actual_duration_formatted,  # Now stores formatted duration string
        vibration_level=control.vibration_level if control else 'N/A'
    )

    # Mark the report as generated
    simulation.report_generated = True

    db.session.add(simulation_result)
    db.session.commit()
