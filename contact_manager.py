import os
import json
import pandas as pd
from processing import _call_openai

CONTACTS_FILE = 'contacts.csv'

CONTACT_INSTRUCTIONS = (
    "You are a helpful assistant who generates contact details for a business."
    " Respond only with a JSON object containing fields: name, title, email, phone."
)

FORMAT_INSTRUCTIONS = (
    "Return only valid JSON containing contact details with fields: name, title, email, phone."
)


def _generate_contact_json(business: str) -> str:
    message = f"Business: {business}"
    return _call_openai(CONTACT_INSTRUCTIONS, message)


def _ensure_json(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        fixed = _call_openai(FORMAT_INSTRUCTIONS, text)
        return json.loads(fixed)


def load_contacts() -> pd.DataFrame:
    if os.path.exists(CONTACTS_FILE):
        return pd.read_csv(CONTACTS_FILE)
    return pd.DataFrame()


def save_contacts(df: pd.DataFrame) -> None:
    df.to_csv(CONTACTS_FILE, index=False)


def add_contacts(businesses: list[str]) -> pd.DataFrame:
    df = load_contacts()
    new_rows = []
    for biz in businesses:
        raw = _generate_contact_json(biz)
        contact = _ensure_json(raw)
        contact['business'] = biz
        new_rows.append(contact)
    if new_rows:
        df = pd.concat([df, pd.DataFrame(new_rows)], ignore_index=True)
        save_contacts(df)
    return df


def add_contacts_from_json(results: list[str]) -> pd.DataFrame:
    """Append contacts using JSON strings already generated."""
    df = load_contacts()
    new_rows = []
    for text in results:
        if not text:
            continue
        contact = _ensure_json(text)
        new_rows.append(contact)
    if new_rows:
        df = pd.concat([df, pd.DataFrame(new_rows)], ignore_index=True)
        save_contacts(df)
    return df


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Usage: python contact_manager.py <Business 1> [Business 2 ...]")
        raise SystemExit(1)

    businesses = sys.argv[1:]
    updated = add_contacts(businesses)
    print("\nCONTACTS table:\n")
    print(updated.to_string(index=False))
