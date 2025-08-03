from flask import jsonify, request

from .. import generate_contacts_bp
from processing import parse_results_to_contacts


@generate_contacts_bp.route('/parse_contacts', methods=['POST'])
def parse_contacts_endpoint():
    """Parse Step 2 results into contact rows."""
    results = request.json.get('results', [])
    contacts = parse_results_to_contacts(results)
    return jsonify(contacts)
