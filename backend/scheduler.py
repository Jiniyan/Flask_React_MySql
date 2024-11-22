from flask_apscheduler import APScheduler
from models import Simulation, db
from datetime import datetime
from report_generator import generate_simulation_report
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = APScheduler()

# Define the background task to check simulation status
@scheduler.task('interval', id='check_simulation_status', seconds=10)  # Check every 10 seconds for better performance
def check_simulation_status():
    """Background task that checks and updates the status of ongoing simulations."""
    from app import app  # Import app to get app context (circular import managed here)

    with app.app_context():
        now = datetime.utcnow()

        # Fetch ongoing simulations
        ongoing_simulations = Simulation.query.filter_by(status='ongoing').all()

        for simulation in ongoing_simulations:
            # If the end_time has passed, update the status to completed immediately
            if simulation.end_time <= now:
                # Update the status of the simulation to 'completed'
                simulation.status = 'completed'
                db.session.commit()
                logger.info(f"Simulation ID {simulation.id} marked as completed.")

                # Generate the simulation report if it hasn't been generated
                if not getattr(simulation, 'report_generated', False):
                    generate_simulation_report(simulation)
                    logger.info(f"Simulation report generated for Simulation ID {simulation.id}.")

def init_scheduler(app):
    """Initialize and start the scheduler."""
    scheduler.init_app(app)
    scheduler.start()
