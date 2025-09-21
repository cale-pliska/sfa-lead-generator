"""Upload endpoints for the guess contact generation method."""

import io

import pandas as pd
from flask import Blueprint, request

from . import data_store

guess_step1_bp = Blueprint(
    "generate_contacts_guess_step1",
    __name__,
    url_prefix="/generate_contacts/guess",
)


@guess_step1_bp.route("/upload", methods=["POST"])
def upload():
    """Load TSV data sent from the client and store it for the guess method."""
    tsv_text = request.form.get("tsv_text", "").strip()
    if not tsv_text:
        return "No TSV data provided", 400

    data_frame = pd.read_csv(io.StringIO(tsv_text), sep="\t", index_col=None)
    data_store.DATAFRAME = data_frame
    return data_frame.to_json(orient="records")
