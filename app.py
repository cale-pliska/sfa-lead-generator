import os
from flask import Flask
from dotenv import load_dotenv
import openai

from steps import step1_bp, step2_bp, step3_bp, step4_bp

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")


def create_app():
    app = Flask(__name__)

    # Register blueprints for each step of the UI
    app.register_blueprint(step1_bp)
    app.register_blueprint(step2_bp)
    app.register_blueprint(step3_bp)
    app.register_blueprint(step4_bp)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
