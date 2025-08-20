import pandas as pd

import json
import re
from ..utilities.openai_helpers import call_openai


def _format_prompt(prompt: str, row: pd.Series) -> str:
    try:
        return prompt.format(**row)
    except KeyError as e:
        return f"Missing column: {e}"


def _strip_json_codeblock(text: str) -> str:
    """Return contents inside the first JSON-style code block if present."""
    match = re.search(r"```json\s*(\[.*?\])\s*```", text, flags=re.DOTALL)
    if match:
        return match.group(1)
    match = re.search(r"```\s*(\[.*?\])\s*```", text, flags=re.DOTALL)
    if match:
        return match.group(1)
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1 and start < end:
        return text[start : end + 1]
    return text


def parse_contacts(raw_result: str):
    """Return a list of contact dicts parsed from the raw OpenAI result."""
    try:
        return json.loads(raw_result)
    except json.JSONDecodeError:
        cleaned = _strip_json_codeblock(raw_result)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return []


def _normalize_contact(contact: dict) -> dict:
    """Return a new contact dict with common fields normalized."""
    normalized = {}
    for key, value in contact.items():
        lower = key.lower().strip().replace(" ", "_")
        if "email" in lower:
            # Collapse any key containing the word "email" to just "email"
            normalized["email"] = value
        else:
            normalized[key] = value
    return normalized


def _extract_business_name(row: dict):
    """Try to guess the business name column from the given row."""
    for key, value in row.items():
        lower = key.lower().replace("_", " ")
        if "business" in lower and "name" in lower:
            return value
    return row.get("name")


def parse_results_to_contacts(results):
    """Parse the 'result' field from each row of step 2 output.

    In addition to the contacts extracted from the JSON ``result`` field, all
    other columns from the Step 2 table are carried over so that downstream
    steps have full context for each contact.
    """
    contacts = []
    for row in results:
        if isinstance(row, dict):
            raw = row.get("result", "")
            base_data = {k: v for k, v in row.items() if k != "result"}
            business_name = _extract_business_name(row)
        else:
            raw = str(row)
            base_data = {}
            business_name = None

        for contact in parse_contacts(raw):
            normalized = _normalize_contact(contact)
            contact_data = {**base_data, **normalized}
            if business_name is not None:
                contact_data.setdefault("business_name", business_name)
            contacts.append(contact_data)
    return contacts


def apply_prompt_to_dataframe(df: pd.DataFrame, instructions: str, prompt: str):
    """Apply the prompt to each row of the dataframe and return results."""
    processed = []
    for _, row in df.iterrows():
        message = _format_prompt(prompt, row)
        result = call_openai(instructions, message)
        row_dict = row.where(pd.notnull(row), None).to_dict()
        processed.append({**row_dict, "result": result})
    return processed


def apply_prompt_to_row(row: pd.Series, instructions: str, prompt: str) -> str:
    """Process a single row using the given prompt."""
    message = _format_prompt(prompt, row)
    return call_openai(instructions, message)
