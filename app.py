import os
from flask import Flask
from dotenv import load_dotenv
import openai

from backend.generate_contacts import (
    pages_bp as gc_pages_bp,
    simple_step1_bp as gc_simple_step1_bp,
    simple_step2_bp as gc_simple_step2_bp,
    simple_step3_bp as gc_simple_step3_bp,
)
from backend.prioritize_businesses import (
    step1_bp as prioritize_step1_bp,
    step2_bp as prioritize_step2_bp,
    step3_bp as prioritize_step3_bp,
)
from backend.parse_locations import (
    step1_bp as parse_step1_bp,
    step2_bp as parse_step2_bp,
    step3_bp as parse_step3_bp,
    step4_bp as parse_step4_bp,
)
from backend.find_businesses import (
    step1_bp as find_step1_bp,
    step2_bp as find_step2_bp,
    step3_bp as find_step3_bp,
)

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")


def create_app():
    app = Flask(__name__, static_folder="frontend/js", template_folder="frontend/html")

    # Register blueprints for each step of the UI
    app.register_blueprint(gc_pages_bp)
    app.register_blueprint(parse_step1_bp)
    app.register_blueprint(parse_step2_bp)
    app.register_blueprint(parse_step3_bp)
    app.register_blueprint(parse_step4_bp)
    app.register_blueprint(find_step1_bp)
    app.register_blueprint(find_step2_bp)
    app.register_blueprint(find_step3_bp)
    app.register_blueprint(prioritize_step1_bp)
    app.register_blueprint(prioritize_step2_bp)
    app.register_blueprint(prioritize_step3_bp)
    app.register_blueprint(gc_simple_step1_bp)
    app.register_blueprint(gc_simple_step2_bp)
    app.register_blueprint(gc_simple_step3_bp)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
