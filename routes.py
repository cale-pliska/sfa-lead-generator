import io
import pandas as pd
from flask import Blueprint, render_template, request, jsonify

from processing import apply_prompt_to_dataframe, apply_prompt_to_row

bp = Blueprint('main', __name__)

# In-memory storage for uploaded data
DATAFRAME = None


@bp.route('/')
def index():
    return render_template('index.html')


@bp.route('/upload', methods=['POST'])
def upload():
    global DATAFRAME
    tsv_text = request.form.get('tsv_text', '').strip()
    if not tsv_text:
        return 'No TSV data provided', 400

    f = io.StringIO(tsv_text)
    DATAFRAME = pd.read_csv(f, sep='\t', index_col=None)
    return DATAFRAME.to_json(orient='records')


@bp.route('/process', methods=['POST'])
def process():
    global DATAFRAME
    prompt = request.json.get('prompt', '')
    results = apply_prompt_to_dataframe(DATAFRAME, prompt)
    return jsonify(results)


@bp.route('/process_single', methods=['POST'])
def process_single():
    """Process a single row of the loaded data."""
    global DATAFRAME
    prompt = request.json.get('prompt', '')
    row_index = int(request.json.get('row_index', 0))
    print(prompt, row_index)
    if DATAFRAME is None or row_index < 0 or row_index >= len(DATAFRAME):
        return 'Invalid row index', 400

    row = DATAFRAME.iloc[row_index]
    result = apply_prompt_to_row(row, prompt)
    new_row = row.to_dict()
    new_row['result'] = result
    return jsonify(new_row)

