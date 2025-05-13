from models import Sensor, Control, SimulationResult, db
from datetime import datetime
import statistics
import redis
import json
redis_client = redis.Redis()
def generate_simulation_report(simulation):
    """Generate a simulation report based on actual sensor data."""
    if getattr(simulation, 'report_generated', False):
        return

    # Get related sensor and control data
    sensor = Sensor.query.filter_by(simulation_id=simulation.id).first()
    control = Control.query.filter_by(simulation_id=simulation.id).first()

    if not sensor or not sensor.data_points:
        print(f"[Report] No sensor data available for simulation {simulation.id}")
        return

    # Calculate duration from simulation start
    actual_duration_seconds = (datetime.utcnow() - simulation.created_at).total_seconds()
    hours = int(actual_duration_seconds // 3600)
    minutes = int((actual_duration_seconds % 3600) // 60)
    seconds = int(actual_duration_seconds % 60)
    actual_duration_formatted = f"{hours} hr {minutes} min {seconds} sec"

    # Use only sensor data for analysis
    data_points = sensor.data_points

    # Calculate average frequency and intensity
    frequencies = [dp['frequency'] for dp in data_points if 'frequency' in dp]
    intensities = [dp['intensity'] for dp in data_points if 'intensity' in dp]
    avg_frequency = statistics.mean(frequencies) if frequencies else 0
    avg_intensity = statistics.mean(intensities) if intensities else 0

    # Capture final voltage
    initial_voltage = data_points[0].get("voltage")
    final_voltage = data_points[-1].get("voltage")
    voltage_drop = round(initial_voltage - final_voltage, 2) if initial_voltage and final_voltage else None
    battery_status = "PASS" if final_voltage is not None and final_voltage > 7.2 else "FAIL"

    # Save result
    simulation_result = SimulationResult(
        simulation_id=simulation.id,
        user_id=simulation.user_id,
        data_points=data_points,
        frequency=avg_frequency,
        intensity=avg_intensity,
        duration=actual_duration_formatted,
        vibration_level=control.vibration_level if control else 'N/A',
        created_at=datetime.utcnow()
    )

    # Update the simulation with diagnostic results
    simulation.end_voltage = final_voltage
    simulation.voltage_drop = voltage_drop
    simulation.battery_status = battery_status
    simulation.report_generated = True

    db.session.add(simulation_result)
    db.session.commit()

    print(f"[Report] Report generated for simulation {simulation.id} - {battery_status}")
    neutral_command = {
        "simulation_id": simulation.id,
        "state": "NEUTRAL"
    }
    redis_client.publish("relay_updates", json.dumps(neutral_command))
    print(f"[Report] Relay set to NEUTRAL for Simulation ID {simulation.id}")
