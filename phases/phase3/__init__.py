from flask import Blueprint, render_template

phase3_bp = Blueprint("phase3", __name__, url_prefix="/phase3")


@phase3_bp.route("/")
def index():
    return render_template("phase3/index.html")

from .step1 import step1_bp  # noqa: E402  pylint: disable=wrong-import-position
from .step2 import step2_bp  # noqa: E402  pylint: disable=wrong-import-position
from .step3 import step3_bp  # noqa: E402  pylint: disable=wrong-import-position

__all__ = ["phase3_bp", "step1_bp", "step2_bp", "step3_bp"]
