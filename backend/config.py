# config.py
class Config:
    SECRET_KEY = 'your_secret_key'  # Replace with a strong secret key
    SQLALCHEMY_DATABASE_URI = 'sqlite:///users.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
