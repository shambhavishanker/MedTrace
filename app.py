from flask import Flask

from main_dashboard.routes import main_dashboard
from dashboard2.routes import dashboard2
from dashboard1.routes import dashboard1
from dashboard3.routes import dashboard3
from ml_routes import ml_routes

app = Flask(__name__)

app.register_blueprint(main_dashboard)
app.register_blueprint(dashboard1)
app.register_blueprint(dashboard2)
app.register_blueprint(dashboard3)
app.register_blueprint(ml_routes)

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=8000,
        debug=True,
        use_reloader=False
    )