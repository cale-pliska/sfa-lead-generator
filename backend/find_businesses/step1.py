import io
import pandas as pd
from flask import Blueprint, render_template, request

from . import data_store

# Blueprint for the Find Businesses page
step1_bp = Blueprint("find_businesses", __name__)


@step1_bp.route("/find_businesses")
def find_businesses():
    """Render the find businesses page."""
    return render_template("find_businesses.html")


@step1_bp.route("/find_businesses/upload", methods=["POST"])
def upload():
    """Load TSV data sent from the client and store it."""
    tsv_text = request.form.get("tsv_text", "").strip()
    if not tsv_text:
        return "No TSV data provided", 400

    f = io.StringIO(tsv_text)
    data_store.DATAFRAME = pd.read_csv(f, sep="\t", index_col=None)
    return data_store.DATAFRAME.to_json(orient="records")
