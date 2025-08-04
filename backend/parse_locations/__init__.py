from flask import Blueprint, jsonify, render_template, request

from ..utilities.openai_helpers import call_openai

parse_locations_bp = Blueprint("parse_locations", __name__)


@parse_locations_bp.route("/parse_locations")
def parse_locations():
    """Render the parse locations page."""
    return render_template("parse_locations.html")


@parse_locations_bp.route("/parse_locations/run_instructions", methods=["POST"])
def run_instructions():
    """Run the provided prompt and GPT instructions through OpenAI and return the result."""
    payload = request.json or {}
    instructions = payload.get("instructions", "")
    prompt = payload.get("prompt", "")
    temperature = payload.get("temperature", 0.5)
    result = call_openai(instructions, prompt, model="gpt-3.5-turbo", temperature=temperature)
    return jsonify({"result": result})


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
        gpt_result = call_openai(instructions, prompt, model="gpt-3.5-turbo")
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
        gpt_result = call_openai(instructions, prompt, model="gpt-3.5-turbo")
        results.append({
            "location": location,
            "raw_data": gpt_result,
        })

    return jsonify({"results": results})
