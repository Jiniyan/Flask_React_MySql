from datetime import datetime
from time import sleep
from models import Simulation
from db import db

def stop_expired_simulations():
    while True:
        now = datetime.utcnow()
        expired_simulations = Simulation.query.filter(Simulation.status == 'ongoing', Simulation.end_time <= now).all()

        for simulation in expired_simulations:
            simulation.status = 'complete'
            db.session.commit()
            print(f"Simulation {simulation.id} has been marked as complete.")

        sleep(60)  # Check every minute
