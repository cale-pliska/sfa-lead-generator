import os
from flask import Flask
from dotenv import load_dotenv
import openai

from blueprints.generate_contacts import generate_contacts_bp
from blueprints.find_businesses import find_businesses_bp
from blueprints.locations_parcer import locations_parcer_bp

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")


def create_app():
    app = Flask(__name__)

    # Register blueprints for each tool/page
    app.register_blueprint(generate_contacts_bp, url_prefix="/generate-contacts")
    app.register_blueprint(find_businesses_bp, url_prefix="/find-businesses")
    app.register_blueprint(locations_parcer_bp, url_prefix="/locations-parcer")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
