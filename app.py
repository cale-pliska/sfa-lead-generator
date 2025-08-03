from flask import Flask
from dotenv import load_dotenv

from steps import pages_bp, step1_bp, step2_bp, step3_bp

load_dotenv()


def create_app():
    app = Flask(__name__)

    # Register blueprints for each step of the UI
    app.register_blueprint(pages_bp)
    app.register_blueprint(step1_bp)
    app.register_blueprint(step2_bp)
    app.register_blueprint(step3_bp)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
