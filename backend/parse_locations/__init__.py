"""Routes and helpers for parsing location data via GPT."""

import json
from typing import Dict, List

from flask import Blueprint, jsonify, render_template, request

from ..utilities.openai_helpers import call_openai


parse_locations_bp = Blueprint("parse_locations", __name__)


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

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


def _request_population(location: str) -> int:
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


def _process_entry(instructions: str, entry: Dict[str, str]) -> Dict[str, str]:
    """Call GPT for a single entry and return the raw result."""
    location = entry.get("location", "")
    population = entry.get("population", "")
    prompt = _build_prompt(location, population)
    raw_data = call_openai(instructions, prompt, model="gpt-4o")
    return {"location": location, "raw_data": raw_data}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@parse_locations_bp.route("/parse_locations")
def parse_locations() -> str:
    """Render the parse locations page."""
    return render_template("parse_locations.html")


@parse_locations_bp.route("/parse_locations/run_instructions", methods=["POST"])
def run_instructions():
    """Look up the population for a location using a fixed GPT prompt."""
    payload = request.json or {}
    location = payload.get("location", payload.get("prompt", ""))
    population = _request_population(location)
    return jsonify({"location_name": location, "population": population})


@parse_locations_bp.route("/parse_locations/process_single", methods=["POST"])
def process_single():
    """Query a single location and capture the raw GPT output."""
    payload = request.json or {}
    instructions = payload.get("instructions", "")
    data: List[Dict[str, str]] = payload.get("data", [])
    results = [_process_entry(instructions, data[0])] if data else []
    return jsonify({"results": results})


@parse_locations_bp.route("/parse_locations/process_all", methods=["POST"])
def process_all():
    """Query all rows and return raw GPT output for each location."""
    payload = request.json or {}
    instructions = payload.get("instructions", "")
    data: List[Dict[str, str]] = payload.get("data", [])
    results = [_process_entry(instructions, entry) for entry in data]
    return jsonify({"results": results})

