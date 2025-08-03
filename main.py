from flask import Blueprint, render_template

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def home():
    """Render the home page with links to all phases."""
    return render_template('index.html')
