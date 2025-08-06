from flask import Blueprint, jsonify, request

from .processing import request_population


step2_bp = Blueprint("parse_locations_step2", __name__)


@step2_bp.route("/parse_locations/run_instructions", methods=["POST"])
def run_instructions():
    """Look up the population for a location using a fixed GPT prompt."""
    payload = request.json or {}
    location = payload.get("location", payload.get("prompt", ""))
    population = request_population(location)
    return jsonify({"location_name": location, "population": population})

