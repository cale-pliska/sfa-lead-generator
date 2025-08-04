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


@parse_locations_bp.route("/parse_locations/process_all", methods=["POST"])
def process_all():
    """Process all rows from step 1 using the provided GPT instructions."""
    payload = request.json or {}
    instructions = payload.get("instructions", "")
    test_loop_depth = payload.get("test_loop_depth", 1)
    data = payload.get("data", [])

    results = []
    for entry in data:
        location = entry.get("location", "")
        population = entry.get("result", "")
        population_stop_depth = entry.get("population_stop_depth", "")
        prompt = (
            f"Location: {location}\n"
            f"Population: {population}\n"
            f"Population Stop Depth: {population_stop_depth}\n"
            f"Test Loop Depth: {test_loop_depth}"
        )
        gpt_result = call_openai(instructions, prompt, model="gpt-3.5-turbo")
        results.append({
            "location": location,
            "population": population,
            "result": gpt_result,
        })

    return jsonify({"results": results})
