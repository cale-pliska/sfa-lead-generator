from flask import Blueprint, render_template

phase1_bp = Blueprint("phase1", __name__, url_prefix="/phase1")


@phase1_bp.route("/")
def index():
    return render_template("phase1/index.html")
