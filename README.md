# SFA Lead Generator

This project provides a lightweight web interface for pasting tab separated values (TSV) and processing each row through the ChatGPT API. It is useful for quick lead generation or analytics workflows that require simple batch processing.

## Features

- Paste TSV text directly into the page.
- View the data in an editable HTML table.
- Enter global **Instructions** for GPT and a custom prompt that can reference columns using `{column}` syntax.
- Batch process each row via the ChatGPT API and display the results.
- Manage and append contact details for businesses via the `/contacts` page.

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
3. Enter any system-wide **Instructions** describing how GPT should respond.
4. Provide a prompt like `Generate a short summary for {name}`.
5. Optionally specify a row index and click **Process Single Row** to test your prompt on one row.
6. Click **Process All Rows** to run the prompt on the entire dataset. A new `result` column will appear with the output from ChatGPT.

## Contact Pipeline

The script `contact_manager.py` generates and stores contact details for business names using the OpenAI API. Each time you run it with new businesses, they are appended to `contacts.csv`.

Example:

```bash
python contact_manager.py "Acme Corp" "Contoso" 
```

This command outputs the updated **CONTACTS** table and saves it to `contacts.csv`.

You can also manage contacts through the web interface. Visit `/contacts` while the Flask app is running to add new businesses and view the current contacts table.

### Importing contacts from processed results

After running a prompt that returns contact details as JSON, click **Import Contacts** on the main page. The JSON from each row will be parsed and appended to `contacts.csv`.
