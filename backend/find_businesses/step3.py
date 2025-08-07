from flask import Blueprint, jsonify, request

from .processing import parse_results_to_businesses

# Blueprint for Step 3 of Find Businesses
step3_bp = Blueprint("find_businesses_step3", __name__)


@step3_bp.route("/find_businesses/parse_contacts", methods=["POST"])
def parse_contacts_endpoint():
    """Parse Step 2 results into business rows."""
    results = request.json.get("results", [])
    businesses = parse_results_to_businesses(results)
    return jsonify(businesses)
