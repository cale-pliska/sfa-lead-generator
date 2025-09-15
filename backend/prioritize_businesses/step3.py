from flask import Blueprint, jsonify, request
from flask import Blueprint, jsonify, request

from .processing import parse_results_to_priorities

step3_bp = Blueprint("prioritize_businesses_step3", __name__)


@step3_bp.route("/prioritize_businesses/parse_priorities", methods=["POST"])
def parse_priorities_endpoint():
    """Parse Step 2 results into prioritized rows."""
    results = request.json.get("results", [])
    priorities = parse_results_to_priorities(results)
    return jsonify(priorities)
