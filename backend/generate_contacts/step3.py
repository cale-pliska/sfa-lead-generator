from flask import Blueprint, jsonify, request

from .processing import format_contacts_with_schema

step3_bp = Blueprint("step3", __name__)


@step3_bp.route("/parse_contacts", methods=["POST"])
def parse_contacts_endpoint():
    """Format Step 2 results into structured contacts using OpenAI."""
    results = request.json.get("results", [])
    schema_definition = request.json.get("schema", "")
    contacts = format_contacts_with_schema(results, schema_definition)
    return jsonify(contacts)
