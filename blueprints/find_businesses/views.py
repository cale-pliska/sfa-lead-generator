from flask import render_template

from . import find_businesses_bp


@find_businesses_bp.route('/')
def index():
    """Render the find businesses page."""
    return render_template('find_businesses/index.html')
