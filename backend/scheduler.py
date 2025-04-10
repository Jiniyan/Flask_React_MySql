from flask_apscheduler import APScheduler
from models import Simulation, db
from datetime import datetime, timedelta
from report_generator import generate_simulation_report
import redis
import json
import requests  # Needed to fetch final voltage
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = APScheduler()
redis_client = redis.Redis()

# Finalize Simulation after Discharge Phase
def finalize_simulation(simulation_id):
    from app import app
    with app.app_context():
        simulation = Simulation.query.get(simulation_id)

        if simulation and simulation.status == 'ongoing':
            # Fetch final voltage
            try:
                sensor = simulation.sensors[0] if simulation.sensors else None
                if sensor and sensor.data_points and isinstance(sensor.data_points, list) and len(sensor.data_points) >= 2:
                    first = sensor.data_points[0]
                    last = sensor.data_points[-1]

                    start_v = first.get("voltage")
                    end_v = last.get("voltage")

                    if start_v is not None and end_v is not None:
                        simulation.start_voltage = start_v
                        simulation.end_voltage = end_v
                        simulation.voltage_drop = round(start_v - end_v, 2)
                        simulation.battery_status = "PASS" if simulation.voltage_drop < 0.7 else "FAIL"
                else:
                    logger.warning(f"Failed to fetch final voltage for simulation {simulation_id}")
            except Exception as e:
                logger.error(f"Voltage fetch error: {e}")

            # Mark simulation as completed
            simulation.status = 'completed'
            db.session.commit()
            logger.info(f"[Scheduler] Simulation {simulation_id} marked as completed after discharge.")

            # Reset relay to NEUTRAL
            neutral_command = {
                "simulation_id": simulation_id,
                "state": "NEUTRAL"
            }
            redis_client.publish("relay_updates", json.dumps(neutral_command))
            logger.info(f"[Scheduler] Relay set to NEUTRAL for Simulation ID {simulation_id}")

            # Generate report
            if not simulation.report_generated:
                generate_simulation_report(simulation)
                logger.info(f"Simulation report generated for Simulation ID {simulation_id}.")

# Periodic Task to Check Simulations
@scheduler.task('interval', id='check_simulation_status', seconds=10)
def check_simulation_status():
    from app import app
    with app.app_context():
        now = datetime.utcnow()
        ongoing_simulations = Simulation.query.filter_by(status='ongoing').all()

        for simulation in ongoing_simulations:
            discharge_start_time = simulation.end_time - timedelta(seconds=30)
            if now >= discharge_start_time and not simulation.discharge_started:
                # Trigger Discharge
                discharge_command = {
                    "simulation_id": simulation.id,
                    "state": "DISCHARGE"
                }
                redis_client.publish("relay_updates", json.dumps(discharge_command))
                logger.info(f"[Scheduler] Discharge phase started for Simulation ID {simulation.id}")

                # Mark discharge started
                simulation.discharge_started = True
                db.session.commit()

                # Schedule Finalization
                scheduler.add_job(
                    id=f"end_discharge_{simulation.id}_{now.timestamp()}",
                    func=finalize_simulation,
                    trigger='date',
                    run_date=simulation.end_time,
                    args=[simulation.id]
                )

# Initialize Scheduler
def init_scheduler(app):
    scheduler.init_app(app)
    scheduler.start()
