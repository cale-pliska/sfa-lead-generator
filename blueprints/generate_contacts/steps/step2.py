from flask import jsonify, request

from .. import generate_contacts_bp
from ..utils import data_store
from processing import apply_prompt_to_dataframe, apply_prompt_to_row


@generate_contacts_bp.route('/process', methods=['POST'])
def process():
    """Apply the prompt to the entire DataFrame."""
    prompt = request.json.get('prompt', '')
    instructions = request.json.get('instructions', '')
    results = apply_prompt_to_dataframe(data_store.DATAFRAME, instructions, prompt)
    return jsonify(results)


@generate_contacts_bp.route('/process_single', methods=['POST'])
def process_single():
    """Process a single row of data."""
    prompt = request.json.get('prompt', '')
    instructions = request.json.get('instructions', '')
    row_index = int(request.json.get('row_index', 0))

    if (
        data_store.DATAFRAME is None
        or row_index < 0
        or row_index >= len(data_store.DATAFRAME)
    ):
        return 'Invalid row index', 400

    row = data_store.DATAFRAME.iloc[row_index]
    result = apply_prompt_to_row(row, instructions, prompt)
    new_row = row.to_dict()
    new_row['result'] = result
    return jsonify(new_row)
