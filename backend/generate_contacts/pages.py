"""Blueprints for general generate contacts pages."""

from flask import Blueprint, render_template

pages_bp = Blueprint("step1", __name__)


@pages_bp.route("/")
def index():
    """Render the main landing page."""
    return render_template("index.html")


@pages_bp.route("/generate_contacts")
def generate_contacts():
    """Render the generate contacts page with method selection."""
    return render_template("generate_contacts.html")
