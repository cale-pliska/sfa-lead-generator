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
- Enter global **Instructions** for GPT and a custom prompt that can reference columns using `{column}` syntax.
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
3. Enter any **Instructions** and a prompt like `Generate a short summary for {name}`.
4. Optionally specify a row index and click **Process Single Row** to test your prompt on one row.
5. Click **Process All Rows** to run the prompt on the entire dataset. A new `result` column will appear with the output from ChatGPT.

### Step 2 Example Output

After processing, the `result` field contains JSON with contact details. Email addresses are now included:

```json
[
  { "firstname": "John", "lastname": "Smith", "role": "Founder", "email": "john.smith@abccompany.com" },
  { "firstname": "Jane", "lastname": "Doe", "role": "COO", "email": "jane.doe@abccompany.com" },
  { "firstname": "Michael", "lastname": "Johnson", "role": "Head of Operations", "email": "michael.johnson@abccompany.com" },
  { "firstname": "Ryan", "lastname": "Patel", "role": "Founder", "email": "ryan.patel@abccompany.com" },
  { "firstname": "Laura", "lastname": "Nguyen", "role": "VP of Operations", "email": "laura.nguyen@abccompany.com" },
  { "firstname": "Carlos", "lastname": "Rivera", "role": "COO", "email": "carlos.rivera@abccompany.com" }
]
```

## Docker

A `docker-compose.yml` file is provided for production deployments along with a
`docker-compose.dev.yml` for local development.

Build and start all services for development:

```bash
docker compose -f docker-compose.dev.yml up --build
```

For production use the default compose file:

```bash
docker compose up -d --build
```

The stack includes containers for the Flask backend, an Nginx front-end proxy,
CouchDB, and PostgreSQL.

