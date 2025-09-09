import io
import pandas as pd
from flask import Blueprint, render_template, request

from . import data_store

step1_bp = Blueprint("prioritize_businesses", __name__)



@step1_bp.route("/prioritize_businesses")
def prioritize_businesses():
    """Render the prioritize businesses page."""
    return render_template("prioritize_businesses.html")


@step1_bp.route("/prioritize_businesses/upload", methods=["POST"])
def upload():
    """Load TSV data sent from the client and store it."""
    tsv_text = request.form.get("tsv_text", "").strip()
    if not tsv_text:
        return "No TSV data provided", 400

    f = io.StringIO(tsv_text)
    data_store.DATAFRAME = pd.read_csv(f, sep="\t", index_col=None)
    return data_store.DATAFRAME.to_json(orient="records")
