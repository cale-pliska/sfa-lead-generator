import io
import pandas as pd
from flask import Blueprint, render_template, request, jsonify

from processing import apply_prompt_to_dataframe

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

