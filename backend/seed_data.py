# seed_data.py
import random
from datetime import datetime
from werkzeug.security import generate_password_hash  # Import password hashing function
from models import User, Simulation, SimulationResult  # Import models from models.py
from db import db
from app import app

# Run seeding within app context
with app.app_context():
    # Clear existing data (optional)
    SimulationResult.query.delete()
    Simulation.query.delete()
    User.query.delete()
    db.session.commit()

    # Create mock users with hashed passwords
    users = []
    for i in range(3):
        hashed_password = generate_password_hash('password')  # Hash the password
        user = User(username=f'user{i}', email=f'user{i}@example.com', password=hashed_password)
        db.session.add(user)
        users.append(user)
    db.session.commit()

    # Create mock simulations and associate with users
    simulations = []
    for _ in range(5):
        simulation = Simulation(user=random.choice(users), status='completed', created_at=datetime.utcnow())
        db.session.add(simulation)
        simulations.append(simulation)
    db.session.commit()

    # Define mock vibration levels
    vibration_levels = ['V1', 'V2', 'V3']

    # Create 10 mock entries for SimulationResult
    for i in range(10):
        # Random duration: 2 hours (7200 seconds) or 20 hours (72000 seconds)
        duration = random.choice([7200, 72000])

        # Generate data points for each second of the simulation
        data_points = [
            {
                'time': second,  # Time is each second
                'frequency': round(random.uniform(0, 60), 2),  # Frequency between 0 and 60 Hz
                'intensity': round(random.uniform(30, 60), 2)  # Acceleration between 30 and 60 m/s²
            } for second in range(min(duration, 3600))  # Limit data points to avoid very large arrays
        ]

        # Generate random values for frequency and intensity
        frequency = round(random.uniform(0, 60), 2)  # Overall frequency
        intensity = round(random.uniform(30, 60), 2)  # Overall intensity
        vibration_level = random.choice(vibration_levels)

        # Choose a random simulation and user
        simulation = random.choice(simulations)
        user = random.choice(users)

        # Create and add SimulationResult
        simulation_result = SimulationResult(
            simulation=simulation,
            user=user,
            data_points=data_points,
            frequency=frequency,
            intensity=intensity,
            duration=duration,
            vibration_level=vibration_level,
            created_at=datetime.utcnow()
        )
        db.session.add(simulation_result)

    db.session.commit()

    print("Database seeded with mock data for SimulationResult and related tables.")
