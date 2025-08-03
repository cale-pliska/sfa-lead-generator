from flask import Flask
from dotenv import load_dotenv

from main import main_bp
from phases import phase1_bp, phase2_bp, phase3_bp, step1_bp, step2_bp, step3_bp

load_dotenv()


def create_app():
    app = Flask(__name__)

    # Register blueprints for home and each phase
    app.register_blueprint(main_bp)
    app.register_blueprint(phase1_bp)
    app.register_blueprint(phase2_bp)
    app.register_blueprint(phase3_bp)
    app.register_blueprint(step1_bp)
    app.register_blueprint(step2_bp)
    app.register_blueprint(step3_bp)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
