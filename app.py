import csv
import io
import os
import asyncio
from flask import Flask, render_template, request, jsonify
import pandas as pd
import openai

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
    else:
        csv_text = request.form.get('csv_text', '')

    if not csv_text:
        return 'No CSV data provided', 400

    try:
        DATAFRAME = pd.read_csv(io.StringIO(csv_text))
    except Exception as e:
        return f'Error parsing CSV: {e}', 400

    return DATAFRAME.to_json(orient='records')

@app.route('/process', methods=['POST'])
def process():
    global DATAFRAME
    prompt = request.json.get('prompt', '')
    if DATAFRAME is None:
        return jsonify({'error': 'No data loaded'}), 400
    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400

    async def run_batch():
        results = []
        for _, row in DATAFRAME.iterrows():
            user_prompt = prompt.format(**row.to_dict())
            try:
                resp = await openai.ChatCompletion.acreate(
                    model='gpt-3.5-turbo',
                    messages=[{'role': 'user', 'content': user_prompt}]
                )
                results.append(resp.choices[0].message.content)
            except Exception as exc:
                results.append(f'Error: {exc}')
        return results

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    results = loop.run_until_complete(run_batch())
    loop.close()

    DATAFRAME['result'] = results
    return DATAFRAME.to_json(orient='records')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
