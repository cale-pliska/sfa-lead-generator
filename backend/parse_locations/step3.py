from typing import Dict, List

from flask import Blueprint, jsonify, request

from .processing import process_entry


step3_bp = Blueprint("parse_locations_step3", __name__)


@step3_bp.route("/parse_locations/process_single", methods=["POST"])
def process_single():
    """Query a single location and capture the raw GPT output."""
    payload = request.json or {}
    instructions = payload.get("instructions", "")
    data: List[Dict[str, str]] = payload.get("data", [])
    results = [process_entry(instructions, data[0])] if data else []
    return jsonify({"results": results})

