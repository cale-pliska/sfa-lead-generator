"""Tool definition for Step 2 ChatGPT calls."""


def get_step2_tool() -> dict:
    """Return the OpenAI tool definition for generating contacts."""
    return {
        "type": "function",
        "function": {
            "name": "create_contacts",
            "description": (
                "Return a list of contacts with 'firstname', 'lastname', and 'role'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "contacts": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "firstname": {"type": "string"},
                                "lastname": {"type": "string"},
                                "role": {"type": "string"},
                            },
                            "required": ["firstname", "lastname", "role"],
                        },
                    }
                },
                "required": ["contacts"],
            },
        },
    }
