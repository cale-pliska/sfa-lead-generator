from flask import Blueprint

step3_bp = Blueprint('step3', __name__)


@step3_bp.route('/step3')
def step3():
    """Placeholder endpoint for future functionality."""
    return 'Step 3 placeholder'
