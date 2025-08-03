"""Phase 1: parse locations."""

from flask import Blueprint, jsonify, render_template, request

from processing import fetch_subregions

phase1_bp = Blueprint('phase1', __name__, url_prefix='/phase1')


@phase1_bp.route('/')
def page():
    """Render the Phase 1 page."""
    return render_template('phase1/index.html')


@phase1_bp.route('/process', methods=['POST'])
def process_location():
    """Process a single location and return subregions with populations."""
    data = request.json or {}
    location = data.get('location', '').strip()
    instructions = data.get('instructions', '')
    if not location:
        return 'No location provided', 400
    regions = fetch_subregions(location, instructions)
    return jsonify(regions)
