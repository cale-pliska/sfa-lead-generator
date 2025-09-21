"""Parsing endpoints for the guess contact generation method."""

from flask import Blueprint, jsonify, request

from ..simple_method.processing import parse_results_to_contacts

guess_step3_bp = Blueprint(
    "generate_contacts_guess_step3",
    __name__,
    url_prefix="/generate_contacts/guess",
)


@guess_step3_bp.route("/parse_contacts", methods=["POST"])
def parse_contacts_endpoint():
    """Parse Step 2 results into contact rows."""
    results = request.json.get("results", [])
    contacts = parse_results_to_contacts(results)
    return jsonify(contacts)
