from flask import Blueprint, jsonify, request

from processing import parse_results_to_contacts

step3_bp = Blueprint("phase3_step3", __name__, url_prefix="/phase3")


@step3_bp.route("/parse_contacts", methods=["POST"])
def parse_contacts_endpoint():
    """Parse Step 2 results into contact rows."""
    results = request.json.get("results", [])
    contacts = parse_results_to_contacts(results)
    return jsonify(contacts)
