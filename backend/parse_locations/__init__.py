import json

from flask import Blueprint, jsonify, render_template, request

from ..utilities.openai_helpers import call_openai

parse_locations_bp = Blueprint("parse_locations", __name__)


@parse_locations_bp.route("/parse_locations")
def parse_locations():
    """Render the parse locations page."""
    return render_template("parse_locations.html")


@parse_locations_bp.route("/parse_locations/run_instructions", methods=["POST"])
def run_instructions():
    """Look up the population for a location using a fixed GPT prompt."""
    payload = request.json or {}
    location = payload.get("location", payload.get("prompt", ""))

    schema = {
        "name": "population_schema",
        "schema": {
            "type": "object",
            "properties": {
                "population": {"type": "integer"},
            },
            "required": ["population"],
            "additionalProperties": False,
        },
    }

    instructions = "Return the population for the given location as JSON following the provided schema."
    message = f"Location: {location}"

    raw_result = call_openai(
        instructions,
        message,
        model="gpt-4o",
        temperature=0,
        response_format={"type": "json_schema", "json_schema": schema},
    )

    try:
        parsed = json.loads(raw_result)
        population = int(str(parsed.get("population", "")).replace(",", ""))
    except Exception:
        population = 0

    return jsonify({"location_name": location, "population": population})


@parse_locations_bp.route("/parse_locations/process_single", methods=["POST"])
def process_single():
    """Query a single location and capture the raw GPT output."""
    payload = request.json or {}
    instructions = payload.get("instructions", "")
    data = payload.get("data", [])

    results = []
    for entry in data[:1]:  # only process the first row
        location = entry.get("location", "")
        population = entry.get("population", "")
        prompt = f"Location: {location}\nPopulation: {population}"
        gpt_result = call_openai(instructions, prompt, model="gpt-4o")
        results.append({
            "location": location,
            "raw_data": gpt_result,
        })

    return jsonify({"results": results})


@parse_locations_bp.route("/parse_locations/process_all", methods=["POST"])
def process_all():
    """Query all rows and return raw GPT output for each location."""
    payload = request.json or {}
    instructions = payload.get("instructions", "")
    data = payload.get("data", [])

    results = []
    for entry in data:
        location = entry.get("location", "")
        population = entry.get("population", "")
        prompt = f"Location: {location}\nPopulation: {population}"
        gpt_result = call_openai(instructions, prompt, model="gpt-4o")
        results.append({
            "location": location,
            "raw_data": gpt_result,
        })

    return jsonify({"results": results})
