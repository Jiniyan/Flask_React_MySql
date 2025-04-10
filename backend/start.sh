#!/bin/bash
cd /home/andromeda0x/Desktop/flask_webapp/Flask_React_MySql/backend
#!/bin/bash
source /home/andromeda0x/Desktop/flask_webapp/Flask_React_MySql/backend/myenv/bin/activate
python /home/andromeda0x/Desktop/flask_webapp/Flask_React_MySql/backend/arduino_bridge.py &
python /home/andromeda0x/Desktop/flask_webapp/Flask_React_MySql/backend/app.py

export FLASK_APP=app.py
export FLASK_ENV=production
flask run --host=0.0.0.0 --port=5000
