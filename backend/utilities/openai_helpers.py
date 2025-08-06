import os
from typing import Any, Dict, Optional

from openai import OpenAI


client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def call_openai(
    instructions: str,
    message: str,
    model: str = "gpt-4o-search-preview",
    temperature: float = 0.5,
    response_format: Optional[Dict[str, Any]] = None,
) -> str:
    """Return completion for the given message using the specified model or placeholder text."""
    if not client.api_key:
        return f"[placeholder] {message}"

    print("\n[OpenAI Request]")
    print("System Instructions:", instructions)
    print("User Message:", message)
    print("Temperature:", temperature)

    try:
        messages = []
        if instructions:
            messages.append({"role": "system", "content": instructions})
        messages.append({"role": "user", "content": message})

        extra_args: Dict[str, Any] = {}
        if "search" in model:
            extra_args["web_search_options"] = {}
        extra_args["temperature"] = temperature
        if response_format:
            extra_args["response_format"] = response_format

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            **extra_args,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"[error] {str(e)}"

