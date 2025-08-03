from flask import Blueprint

find_businesses_bp = Blueprint('find_businesses', __name__)

from . import views  # noqa: E402,F401
