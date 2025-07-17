import csv
import io
import os
import asyncio
from flask import Flask, render_template, request, jsonify
import pandas as pd
import openai
import openai
from dotenv import load_dotenv

load_dotenv()  # 👈 this makes FLASK_ENV and others available

openai.api_key = os.getenv("OPENAI_API_KEY")

app = Flask(__name__)

# In-memory storage for uploaded data
DATAFRAME = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
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

@app.route('/process', methods=['POST'])
def process():
    global DATAFRAME
    prompt = request.json.get('prompt', '')

    # Simple fake logic: apply prompt formatting to each row
    processed = []
    for _, row in DATAFRAME.iterrows():
        try:
            result = prompt.format(**row)
        except KeyError as e:
            result = f"Missing column: {e}"
        processed.append({**row.to_dict(), 'result': result})

    return jsonify(processed)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
