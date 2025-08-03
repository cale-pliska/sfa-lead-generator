from flask import render_template

from . import generate_contacts_bp


@generate_contacts_bp.route('/')
def index():
    """Render the generate contacts page."""
    return render_template('generate_contacts/index.html')
