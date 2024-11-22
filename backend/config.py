class Config:
    SECRET_KEY = 'your_secret_key'  # Keep your secret key secure
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:@localhost:3306/users'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
