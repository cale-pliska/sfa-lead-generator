from flask import render_template

from . import locations_parcer_bp


@locations_parcer_bp.route('/')
def index():
    """Render the locations parser page."""
    return render_template('locations_parcer/index.html')
