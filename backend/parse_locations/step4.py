from typing import Dict, List

from flask import Blueprint, jsonify, request

from .processing import process_entry


step4_bp = Blueprint("parse_locations_step4", __name__)


@step4_bp.route("/parse_locations/process_all", methods=["POST"])
def process_all():
    """Query all rows and return raw GPT output for each location."""
    payload = request.json or {}
    instructions = payload.get("instructions", "")
    data: List[Dict[str, str]] = payload.get("data", [])
    results = [process_entry(instructions, entry) for entry in data]
    return jsonify({"results": results})

