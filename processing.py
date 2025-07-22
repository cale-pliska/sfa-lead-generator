import os
import pandas as pd

import json
import re
from openai import OpenAI
from typing import List, Optional

# Create a reusable OpenAI client instance
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _call_openai(
    instructions: str,
    message: str,
    model: str = "gpt-4o-search-preview",
    tools: Optional[List[dict]] = None,
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

        kwargs = {
            "model": model,
            "web_search_options": {},
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = {
                "type": "function",
                "function": {"name": tools[0]["function"]["name"]},
            }

        response = client.chat.completions.create(**kwargs)
        choice = response.choices[0]
        if tools and choice.finish_reason == "tool_calls" and choice.message.tool_calls:
            return choice.message.tool_calls[0].function.arguments
        return choice.message.content.strip()
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


def parse_contacts(raw_result: str):
    """Return a list of contact dicts parsed from the raw OpenAI result."""
    try:
        data = json.loads(raw_result)
        if isinstance(data, dict) and "contacts" in data:
            return data["contacts"]
        return data
    except json.JSONDecodeError:
        cleaned = _strip_json_codeblock(raw_result)
        try:
            data = json.loads(cleaned)
            if isinstance(data, dict) and "contacts" in data:
                return data["contacts"]
            return data
        except json.JSONDecodeError:
            return []


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
            contact_data = {**base_data, **contact}
            if business_name is not None:
                contact_data.setdefault("business_name", business_name)
            contacts.append(contact_data)
    return contacts


def apply_prompt_to_dataframe(
    df: pd.DataFrame, instructions: str, prompt: str, tools: Optional[List[dict]] = None
):
    """Apply the prompt to each row of the dataframe and return results."""
    processed = []
    for _, row in df.iterrows():
        message = _format_prompt(prompt, row)
        result = _call_openai(instructions, message, tools=tools)
        processed.append({**row.to_dict(), "result": result})
    return processed


def apply_prompt_to_row(
    row: pd.Series, instructions: str, prompt: str, tools: Optional[List[dict]] = None
) -> str:
    """Process a single row using the given prompt."""
    message = _format_prompt(prompt, row)
    return _call_openai(instructions, message, tools=tools)
