import os
import pandas as pd
import openai


openai.api_key = os.getenv("OPENAI_API_KEY")


def _call_openai(message: str) -> str:
    """Return completion for the given message or placeholder text."""
    if not openai.api_key:
        return f"[placeholder] {message}"

    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": message}],
    )
    return response.choices[0].message.get("content", "").strip()


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

