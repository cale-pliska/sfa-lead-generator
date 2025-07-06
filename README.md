# Google Sheets Triggered GitHub Action

This project demonstrates how to run Python code from GitHub Actions using data
from Google Sheets. The workflow can be triggered directly from a Google Sheet
via a Google Apps Script created with `clasp`.

## Python script

`scripts/read_sheet.py` connects to Google Sheets using a service account and
prints the rows from the first worksheet. The script requires the following
environment variables:

- `SHEET_ID` – ID of the Google Sheet.
- `GOOGLE_CREDENTIALS_JSON` – contents of the service account JSON key.
  Alternatively, you can set `GOOGLE_APPLICATION_CREDENTIALS` to the path of the
  JSON file.

Dependencies are listed in `requirements.txt` and are installed by the GitHub
workflow.

## GitHub Actions workflow

`.github/workflows/run-python.yml` installs the requirements and executes the
Python script. It is triggered with `workflow_dispatch`, so it can be called via
the GitHub API. Add the `SHEET_ID` and `GOOGLE_CREDENTIALS_JSON` values as
repository secrets.

## Google Apps Script

`apps-script/Code.js` contains a simple Apps Script that adds a "GitHub Actions"
menu to the Sheet. Selecting **Run Python Script** dispatches the GitHub
workflow. Before deploying, set the following script properties using the Apps
Script dashboard or `clasp`:

- `GITHUB_TOKEN` – a personal access token with `repo` scope.
- `REPO` – `<owner>/<repository>` for this project.

Deploy the script with `clasp push` and create a button or use the custom menu
in your Sheet to trigger the workflow.

## Usage

1. Configure the Google service account and share your sheet with the service
   account email.
2. Set repository secrets `SHEET_ID` and `GOOGLE_CREDENTIALS_JSON`.
3. Deploy the Apps Script and set its script properties.
4. Click **Run Python Script** in your Google Sheet to start the workflow.
