import os
import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials

def get_credentials():
    json_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if json_path and os.path.exists(json_path):
        return ServiceAccountCredentials.from_json_keyfile_name(
            json_path,
            scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
        )
    creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if not creds_json:
        raise RuntimeError("Missing Google credentials")
    with open("/tmp/creds.json", "w") as fh:
        fh.write(creds_json)
    return ServiceAccountCredentials.from_json_keyfile_name(
        "/tmp/creds.json",
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
    )

def main():
    sheet_id = os.environ.get("SHEET_ID")
    if not sheet_id:
        raise RuntimeError("SHEET_ID environment variable not set")
    creds = get_credentials()
    client = gspread.authorize(creds)
    sheet = client.open_by_key(sheet_id).sheet1
    data = sheet.get_all_records()
    print("Fetched rows:")
    for row in data:
        print(row)

if __name__ == "__main__":
    main()
