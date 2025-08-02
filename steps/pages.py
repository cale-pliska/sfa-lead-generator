"""Blueprint for application pages and Phase 1 processing."""

from flask import Blueprint, jsonify, render_template, request

from processing import fetch_subregions

pages_bp = Blueprint("pages", __name__)


@pages_bp.route("/")
def home():
    """Render home page with links to all phases."""
    return render_template("index.html")


@pages_bp.route("/phase1")
def phase1_page():
    """Render Phase 1 page for parsing locations."""
    return render_template("phase1.html")


@pages_bp.route("/phase2")
def phase2_page():
    """Render placeholder Phase 2 page."""
    return render_template("phase2.html")


@pages_bp.route("/phase3")
def phase3_page():
    """Render Phase 3 page with existing functionality."""
    return render_template("phase3.html")


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
