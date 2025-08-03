from flask import Blueprint

# Blueprint for generate_contacts feature

generate_contacts_bp = Blueprint('generate_contacts', __name__)

# Import routes so they register with the blueprint
from . import views  # noqa: E402,F401
from .steps import step1, step2, step3  # noqa: E402,F401
