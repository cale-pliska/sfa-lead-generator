import os
import json
import re

import pandas as pd
from openai import OpenAI

# Create a reusable OpenAI client instance
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))


def _call_openai(
    instructions: str, message: str, model: str = "gpt-4o-search-preview"
) -> str:
    """Return completion for the given message using the specified model or placeholder text."""
    if not client.api_key:
        return f"[placeholder] {message}"

    print("\n[OpenAI Request]")
    print("System Instructions:", instructions)
    print("User Message:", message)

    try:
        messages = []
        if instructions:
            messages.append({"role": "system", "content": instructions})
        messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model=model,
            web_search_options={},
            messages=messages,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"[error] {str(e)}"


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


def _safe_json_loads(text: str, default):
    """Attempt to parse JSON from ``text``; return ``default`` on failure."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        cleaned = _strip_json_codeblock(text)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return default


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

        for contact in _safe_json_loads(raw, []):
            normalized = _normalize_contact(contact)
            contact_data = {**base_data, **normalized}
            if business_name is not None:
                contact_data.setdefault("business_name", business_name)
            contacts.append(contact_data)
    return contacts


def fetch_subregions(location: str, instructions: str):
    """Return list of subregions and populations for a location."""
    message = (
        f"For the location '{location}', list its immediate subregions with their population. "
        "Respond in JSON array of objects with 'region' and 'population' fields."
    )
    raw = _call_openai(instructions, message)
    return _safe_json_loads(raw, [])


def apply_prompt_to_dataframe(df: pd.DataFrame, instructions: str, prompt: str):
    """Apply the prompt to each row of the dataframe and return results."""
    processed = []
    for _, row in df.iterrows():
        message = _format_prompt(prompt, row)
        result = _call_openai(instructions, message)
        processed.append({**row.to_dict(), "result": result})
    return processed


def apply_prompt_to_row(row: pd.Series, instructions: str, prompt: str) -> str:
    """Process a single row using the given prompt."""
    message = _format_prompt(prompt, row)
    return _call_openai(instructions, message)
