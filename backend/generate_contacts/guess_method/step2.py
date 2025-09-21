"""Processing endpoints for the guess contact generation method."""

import pandas as pd
from flask import Blueprint, jsonify, request

from . import data_store
from ..simple_method.processing import apply_prompt_to_dataframe, apply_prompt_to_row

guess_step2_bp = Blueprint(
    "generate_contacts_guess_step2",
    __name__,
    url_prefix="/generate_contacts/guess",
)


@guess_step2_bp.route("/process", methods=["POST"])
def process():
    """Apply the prompt to every row in the stored dataframe."""
    if data_store.DATAFRAME is None:
        return "No data loaded", 400

    prompt = request.json.get("prompt", "")
    instructions = request.json.get("instructions", "")
    raw_results = apply_prompt_to_dataframe(
        data_store.DATAFRAME, instructions, prompt
    )
    transformed = []
    for row in raw_results:
        if isinstance(row, dict):
            updated_row = {k: v for k, v in row.items() if k != "result"}
            updated_row["raw_public_emails"] = row.get("result", "")
        else:
            updated_row = {"raw_public_emails": row}
        transformed.append(updated_row)
    return jsonify(transformed)


@guess_step2_bp.route("/process_single", methods=["POST"])
def process_single():
    """Process a single row of data using the configured prompt."""
    if data_store.DATAFRAME is None:
        return "No data loaded", 400

    prompt = request.json.get("prompt", "")
    instructions = request.json.get("instructions", "")
    row_index = int(request.json.get("row_index", 0))

    if row_index < 0 or row_index >= len(data_store.DATAFRAME):
        return "Invalid row index", 400

    row = data_store.DATAFRAME.iloc[row_index]
    result = apply_prompt_to_row(row, instructions, prompt)
    new_row = row.where(pd.notna(row), None).to_dict()
    new_row["raw_public_emails"] = result
    return jsonify(new_row)
