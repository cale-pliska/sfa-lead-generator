source venv/bin/activate
source .env
flask run --debug


## TODO: -> 
Make this cleaner like using make (eventually)


# SFA Lead Generator

This project provides a lightweight web interface for pasting tab separated values (TSV) and processing each row through the ChatGPT API. It is useful for quick lead generation or analytics workflows that require simple batch processing.

## Features

- Paste TSV text directly into the page.
- View the data in an editable HTML table.
- Enter a custom prompt that can reference columns using `{column}` syntax.
- Batch process each row via the ChatGPT API and display the results.

## Requirements

- Python 3.12+
- A valid `OPENAI_API_KEY` environment variable if you intend to run API calls.

Install dependencies:

```bash
pip install -r requirements.txt
```

## Running

```bash
export OPENAI_API_KEY=your-key
python app.py
```

The server will start on `http://localhost:5000`.

## Usage

1. Open the page in your browser.
2. Paste your TSV data and click **Load Data**.
3. Provide a prompt like `Generate a short summary for {name}`.
4. Optionally specify a row index and click **Process Single Row** to test your prompt on one row.
5. Click **Process All Rows** to run the prompt on the entire dataset. A new `result` column will appear with the output from ChatGPT.
