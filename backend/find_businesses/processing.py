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


def parse_businesses(raw_result: str):
    """Return a list of business dicts parsed from the raw OpenAI result."""
    try:
        return json.loads(raw_result)
    except json.JSONDecodeError:
        cleaned = _strip_json_codeblock(raw_result)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return []


def parse_results_to_businesses(results):
    """Parse the 'result' field from each row of step 2 output.

    Each business object extracted from the JSON ``result`` field is combined
    with the non-result columns from the Step 2 table so downstream steps have
    full context for each business.
    """
    businesses = []
    for row in results:
        if isinstance(row, dict):
            raw = row.get("result", "")
            base_data = {k: v for k, v in row.items() if k != "result"}
        else:
            raw = str(row)
            base_data = {}

        for business in parse_businesses(raw):
            business_data = {**base_data, **business}
            businesses.append(business_data)
    return businesses


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
