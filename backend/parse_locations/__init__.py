from flask import Blueprint, jsonify, render_template, request

from ..utilities.openai_helpers import call_openai

parse_locations_bp = Blueprint("parse_locations", __name__)


@parse_locations_bp.route("/parse_locations")
def parse_locations():
    """Render the parse locations page."""
    return render_template("parse_locations.html")


@parse_locations_bp.route("/parse_locations/run_prompt", methods=["POST"])
def run_prompt():
    """Run the provided prompt through OpenAI and return the result."""
    prompt = (request.json or {}).get("prompt", "")
    result = call_openai("", prompt, model="gpt-3.5-turbo")
    return jsonify({"result": result})
