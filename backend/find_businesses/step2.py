from flask import Blueprint, jsonify, request

from . import data_store
from .processing import apply_prompt_to_dataframe, apply_prompt_to_row

# Blueprint for Step 2 of Find Businesses
step2_bp = Blueprint("find_businesses_step2", __name__)


@step2_bp.route("/find_businesses/process", methods=["POST"])
def process():
    """Apply the prompt to the entire DataFrame."""
    prompt = request.json.get("prompt", "")
    instructions = request.json.get("instructions", "")
    results = apply_prompt_to_dataframe(data_store.DATAFRAME, instructions, prompt)
    return jsonify(results)


@step2_bp.route("/find_businesses/process_single", methods=["POST"])
def process_single():
    """Process a single row of data."""
    prompt = request.json.get("prompt", "")
    instructions = request.json.get("instructions", "")
    row_index = int(request.json.get("row_index", 0))

    if (
        data_store.DATAFRAME is None
        or row_index < 0
        or row_index >= len(data_store.DATAFRAME)
    ):
        return "Invalid row index", 400

    row = data_store.DATAFRAME.iloc[row_index]
    result = apply_prompt_to_row(row, instructions, prompt)
    new_row = row.to_dict()
    new_row["result"] = result
    new_row["index"] = row_index
    return jsonify(new_row)


@step2_bp.route("/find_businesses/process_range", methods=["POST"])
def process_range():
    """Process a range of rows from start_index to end_index inclusive."""
    prompt = request.json.get("prompt", "")
    instructions = request.json.get("instructions", "")
    start_index = int(request.json.get("start_index", 0))
    end_index = int(request.json.get("end_index", start_index))

    if (
        data_store.DATAFRAME is None
        or start_index < 0
        or end_index >= len(data_store.DATAFRAME)
        or start_index > end_index
    ):
        return "Invalid index range", 400

    df_slice = data_store.DATAFRAME.iloc[start_index : end_index + 1]
    results = apply_prompt_to_dataframe(df_slice, instructions, prompt)
    return jsonify(results)
