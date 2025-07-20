import os
import pandas as pd

from openai import OpenAI

# Create a reusable OpenAI client instance
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def _call_openai(message: str) -> str:
    """Return completion for the given message using gpt-4o-search-preview, or placeholder text."""
    if not client.api_key:
        return f"[placeholder] {message}"

    try:
        response = client.chat.completions.create(
            model="gpt-4o-search-preview",
            web_search_options={},  # empty = search allowed but optional
            messages=[
                {"role": "user", "content": message}
            ],
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"[error] {str(e)}"

def _format_prompt(prompt: str, row: pd.Series) -> str:
    try:
        return prompt.format(**row)
    except KeyError as e:
        return f"Missing column: {e}"


def apply_prompt_to_dataframe(df: pd.DataFrame, prompt: str):
    """Apply the prompt to each row of the dataframe and return results."""
    processed = []
    for _, row in df.iterrows():
        message = _format_prompt(prompt, row)
        result = _call_openai(message)
        processed.append({**row.to_dict(), 'result': result})
    return processed


def apply_prompt_to_row(row: pd.Series, prompt: str) -> str:
    """Process a single row using the given prompt."""
    message = _format_prompt(prompt, row)
    return _call_openai(message)

