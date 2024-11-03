# config.py
class Config:
    SECRET_KEY = 'your_secret_key'
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:%40pass123@localhost:3307/users'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
