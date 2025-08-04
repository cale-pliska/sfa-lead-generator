from flask import Blueprint, jsonify, render_template, request

from ..utilities.openai_helpers import call_openai

parse_locations_bp = Blueprint("parse_locations", __name__)


@parse_locations_bp.route("/parse_locations")
def parse_locations():
    """Render the parse locations page."""
    return render_template("parse_locations.html")


@parse_locations_bp.route("/parse_locations/run_instructions", methods=["POST"])
def run_instructions():
    """Run the provided prompt and GPT instructions through OpenAI and return the result."""
    payload = request.json or {}
    instructions = payload.get("instructions", "")
    prompt = payload.get("prompt", "")
    result = call_openai(instructions, prompt, model="gpt-3.5-turbo")
    return jsonify({"result": result})
