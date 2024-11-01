# config.py
class Config:
    SECRET_KEY = 'your_secret_key'  # Replace with a strong secret key
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:@localhost:3306/users'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
