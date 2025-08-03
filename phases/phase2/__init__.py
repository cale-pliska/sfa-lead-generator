"""Phase 2: generate businesses."""

from flask import Blueprint, render_template

phase2_bp = Blueprint('phase2', __name__, url_prefix='/phase2')


@phase2_bp.route('/')
def page():
    """Render the Phase 2 page."""
    return render_template('phase2/index.html')
