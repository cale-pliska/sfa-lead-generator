import os
import pandas as pd

import json
import re
from openai import OpenAI

# Create a reusable OpenAI client instance
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _call_openai(instructions: str, message: str, model: str = "gpt-4o-search-preview") -> str:
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
    start = text.find('[')
    end = text.rfind(']')
    if start != -1 and end != -1 and start < end:
        return text[start:end + 1]
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


def _extract_business_name(row: dict):
    """Try to guess the business name column from the given row."""
    for key, value in row.items():
        lower = key.lower().replace('_', ' ')
        if 'business' in lower and 'name' in lower:
            return value
    return row.get('name')


def parse_results_to_contacts(results):
    """Parse the 'result' field from each row of step 2 output."""
    contacts = []
    for row in results:
        raw = row.get('result', '') if isinstance(row, dict) else str(row)
        business_name = _extract_business_name(row) if isinstance(row, dict) else None
        for contact in parse_contacts(raw):
            if business_name is not None:
                contact['business_name'] = business_name
            contacts.append(contact)
    return contacts


def apply_prompt_to_dataframe(df: pd.DataFrame, instructions: str, prompt: str):
    """Apply the prompt to each row of the dataframe and return results."""
    processed = []
    for _, row in df.iterrows():
        message = _format_prompt(prompt, row)
        result = _call_openai(instructions, message)
        processed.append({**row.to_dict(), 'result': result})
    return processed


def apply_prompt_to_row(row: pd.Series, instructions: str, prompt: str) -> str:
    """Process a single row using the given prompt."""
    message = _format_prompt(prompt, row)
    return _call_openai(instructions, message)
