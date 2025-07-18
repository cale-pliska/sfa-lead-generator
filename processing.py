import pandas as pd


def apply_prompt_to_dataframe(df: pd.DataFrame, prompt: str):
    """Apply the prompt to each row of the dataframe and return results."""
    processed = []
    for _, row in df.iterrows():
        try:
            result = prompt.format(**row)
        except KeyError as e:
            result = f"Missing column: {e}"
        processed.append({**row.to_dict(), 'result': result})
    return processed

