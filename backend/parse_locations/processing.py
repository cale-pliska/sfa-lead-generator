"""Helper functions for the parse_locations feature."""

from __future__ import annotations

import json
from typing import Dict

from ..utilities.openai_helpers import call_openai

POPULATION_SCHEMA = {
    "name": "population_schema",
    "schema": {
        "type": "object",
        "properties": {"population": {"type": "integer"}},
        "required": ["population"],
        "additionalProperties": False,
    },
}

POPULATION_INSTRUCTIONS = (
    "Return the population for the given location as JSON following the provided schema."
)


def _parse_population(raw_result: str) -> int:
    """Extract an integer population value from the raw GPT response."""
    try:
        parsed = json.loads(raw_result)
        return int(str(parsed.get("population", "")).replace(",", ""))
    except Exception:
        return 0


def request_population(location: str) -> int:
    """Query GPT for the population of a location and return it as an integer."""
    message = f"Location: {location}"
    raw_result = call_openai(
        POPULATION_INSTRUCTIONS,
        message,
        model="gpt-4o",
        temperature=0,
        response_format={"type": "json_schema", "json_schema": POPULATION_SCHEMA},
    )
    return _parse_population(raw_result)


def _build_prompt(location: str, population: str) -> str:
    """Create the prompt used for custom GPT queries."""
    return f"Location: {location}\nPopulation: {population}"


def process_entry(instructions: str, entry: Dict[str, str]) -> Dict[str, str]:
    """Call GPT for a single entry and return the raw result."""
    location = entry.get("location", "")
    population = entry.get("population", "")
    prompt = _build_prompt(location, population)
    raw_data = call_openai(instructions, prompt, model="gpt-4o")
    return {"location": location, "raw_data": raw_data}


__all__ = ["request_population", "process_entry"]

