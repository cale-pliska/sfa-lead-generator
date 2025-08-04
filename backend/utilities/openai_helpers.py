import os

from openai import OpenAI


client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def call_openai(instructions: str, message: str, model: str = "gpt-4o-search-preview") -> str:
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

