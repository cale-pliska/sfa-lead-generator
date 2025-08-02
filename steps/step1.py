import io
import pandas as pd
from flask import Blueprint, request

from . import data_store

step1_bp = Blueprint("step1", __name__)


@step1_bp.route("/upload", methods=["POST"])
def upload():
    """Load TSV data sent from the client and store it."""
    tsv_text = request.form.get("tsv_text", "").strip()
    if not tsv_text:
        return "No TSV data provided", 400

    f = io.StringIO(tsv_text)
    data_store.DATAFRAME = pd.read_csv(f, sep="\t", index_col=None)
    return data_store.DATAFRAME.to_json(orient="records")
