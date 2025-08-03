from flask import Blueprint

locations_parcer_bp = Blueprint('locations_parcer', __name__)

from . import views  # noqa: E402,F401
