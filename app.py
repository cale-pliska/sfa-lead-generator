import os
from flask import Flask
from dotenv import load_dotenv
import openai

from phases.home import home_bp
from phases.phase1 import phase1_bp
from phases.phase2 import phase2_bp
from phases.phase3 import phase3_bp, step1_bp, step2_bp, step3_bp

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")


def create_app():
    app = Flask(__name__)

    # Register blueprints for each page
    app.register_blueprint(home_bp)
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
