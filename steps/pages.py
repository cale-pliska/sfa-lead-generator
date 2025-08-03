"""Blueprint for application pages and Phase 1 processing."""

from flask import Blueprint, jsonify, render_template, request

from processing import fetch_subregions

pages_bp = Blueprint("pages", __name__)


@pages_bp.route("/")
def home():
    """Render home page with links to all phases."""
    return render_template("index.html")

@pages_bp.route("/phase1/process", methods=["POST"])
def process_location():
    """Process a single location and return subregions with populations."""
    data = request.json or {}
    location = data.get("location", "").strip()
    instructions = data.get("instructions", "")
    if not location:
        return "No location provided", 400
    regions = fetch_subregions(location, instructions)
    return jsonify(regions)
