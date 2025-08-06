from flask import Blueprint, render_template


step1_bp = Blueprint("parse_locations_step1", __name__)


@step1_bp.route("/parse_locations")
def parse_locations():
    """Render the parse locations page."""
    return render_template("parse_locations.html")

