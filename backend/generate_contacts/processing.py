import json
import re
from typing import Any, Dict, List, Optional

import pandas as pd
from ..utilities.openai_helpers import call_openai

DEFAULT_CONTACT_SCHEMA: Dict[str, Any] = {
    "name": "ContactList",
    "schema": {
        "type": "object",
        "properties": {
            "contacts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "first_name": {"type": "string"},
                        "last_name": {"type": "string"},
                        "role": {"type": "string"},
                        "email": {"type": "string"},
                    },
                    "required": ["first_name", "last_name"],
                    "additionalProperties": True,
                },
            }
        },
        "required": ["contacts"],
        "additionalProperties": False,
    },
}


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


def _load_schema(schema_definition: str) -> Optional[Dict[str, Any]]:
    """Attempt to parse the provided schema definition as JSON."""
    schema_text = schema_definition.strip()
    if not schema_text:
        return None
    try:
        parsed = json.loads(schema_text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        return None
    return None


def format_contacts_with_schema(results: List[Any], schema_definition: str) -> List[Dict[str, Any]]:
    """Use OpenAI to format contacts so they match the provided schema."""

    base_contacts = parse_results_to_contacts(results)
    schema_json = _load_schema(schema_definition)
    schema_text = schema_definition.strip()

    if schema_json is None:
        if schema_text:
            schema_for_prompt = schema_text
        else:
            schema_for_prompt = json.dumps(DEFAULT_CONTACT_SCHEMA, indent=2)
        response_schema = json.loads(json.dumps(DEFAULT_CONTACT_SCHEMA))
    else:
        schema_for_prompt = json.dumps(schema_json, indent=2)
        response_schema = schema_json

    if isinstance(response_schema, dict) and "schema" in response_schema and "name" in response_schema:
        response_format = {"type": "json_schema", "json_schema": response_schema}
    else:
        response_format = None

    payload = {
        "schema_to_follow": schema_for_prompt,
        "provided_schema_text": schema_text or None,
        "contacts": base_contacts,
        "raw_results": results,
    }

    response = call_openai(
        instructions=(
            "You transform semi-structured contact data into JSON that strictly adheres to the provided schema. "
            "Respond with JSON only."
        ),
        message=(
            "Format the contacts so that they follow the schema_to_follow value. Use null for missing values.\n\n"
            f"Input:\n{json.dumps(payload, indent=2, default=str)}"
        ),
        model="gpt-4o-mini",
        temperature=0,
        response_format=response_format,
    )

    parsed_response = parse_contacts(response)

    if isinstance(parsed_response, dict):
        contacts = parsed_response.get("contacts")
        if isinstance(contacts, list):
            return contacts
        return [parsed_response]

    if isinstance(parsed_response, list):
        return parsed_response

    return base_contacts


def apply_prompt_to_dataframe(df: pd.DataFrame, instructions: str, prompt: str):
    """Apply the prompt to each row of the dataframe and return results."""
    processed = []
    for _, row in df.iterrows():
        message = _format_prompt(prompt, row)
        result = call_openai(instructions, message)
        processed.append({**row.to_dict(), "result": result})
    return processed


def apply_prompt_to_row(row: pd.Series, instructions: str, prompt: str) -> str:
    """Process a single row using the given prompt."""
    message = _format_prompt(prompt, row)
    return call_openai(instructions, message)
