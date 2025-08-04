import os
from flask import Flask
from dotenv import load_dotenv
import openai

from backend.generate_contacts import step1_bp, step2_bp, step3_bp

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")


def create_app():
    app = Flask(__name__, static_folder="frontend/js", template_folder="frontend/html")

    # Register blueprints for each step of the UI
    app.register_blueprint(step1_bp)
    app.register_blueprint(step2_bp)
    app.register_blueprint(step3_bp)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
