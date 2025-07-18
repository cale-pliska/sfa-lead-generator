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
    csv_text = ''

    if 'csv_file' in request.files and request.files['csv_file']:
        file = request.files['csv_file']
        csv_text = file.read().decode('utf-8')
    elif 'csv_text' in request.form and request.form['csv_text'].strip():
        csv_text = request.form['csv_text']
    else:
        return 'No CSV data provided', 400

    f = io.StringIO(csv_text)
    DATAFRAME = pd.read_csv(f)
    return DATAFRAME.to_json(orient='records')


@bp.route('/process', methods=['POST'])
def process():
    global DATAFRAME
    prompt = request.json.get('prompt', '')
    results = apply_prompt_to_dataframe(DATAFRAME, prompt)
    return jsonify(results)

