"""Tool definition for Step 4 ChatGPT calls."""


def get_step4_tool() -> dict:
    """Return the OpenAI tool definition for enriching contacts with an email."""
    return {
        "type": "function",
        "function": {
            "name": "create_email",
            "description": "Return a valid email address as a simple string.",
            "parameters": {
                "type": "object",
                "properties": {"email": {"type": "string", "format": "email"}},
                "required": ["email"],
            },
        },
    }
