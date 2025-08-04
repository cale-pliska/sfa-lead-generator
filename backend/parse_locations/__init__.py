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
    """Process rows up to the provided test loop depth."""
    payload = request.json or {}
    instructions = payload.get("instructions", "")
    test_loop_depth = int(payload.get("test_loop_depth", 1))
    data = payload.get("data", [])

    results = []
    for entry in data:
        location = entry.get("location", "")
        population = int(entry.get("result", 0))
        population_stop_depth = int(entry.get("population_stop_depth", 0))

        current_population = population
        loop_depth = 1
        while loop_depth <= test_loop_depth:
            prompt = (
                f"Location: {location}\n"
                f"Population: {current_population}\n"
                f"Population Stop Depth: {population_stop_depth}\n"
                f"Test Loop Depth: {loop_depth}"
            )
            gpt_result = call_openai(instructions, prompt, model="gpt-3.5-turbo")
            try:
                current_population = int(gpt_result)
            except (ValueError, TypeError):
                break
            loop_depth += 1

        results.append({
            "location": location,
            "population": current_population,
        })

    return jsonify({"results": results})


@parse_locations_bp.route("/parse_locations/process_all", methods=["POST"])
def process_all():
    """Process rows until population falls below the stop depth or max depth reached."""
    payload = request.json or {}
    instructions = payload.get("instructions", "")
    data = payload.get("data", [])

    results = []
    for entry in data:
        location = entry.get("location", "")
        population = int(entry.get("result", 0))
        population_stop_depth = int(entry.get("population_stop_depth", 0))

        current_population = population
        loop_depth = 1
        while loop_depth <= 5 and current_population > population_stop_depth:
            prompt = (
                f"Location: {location}\n"
                f"Population: {current_population}\n"
                f"Population Stop Depth: {population_stop_depth}\n"
                f"Test Loop Depth: {loop_depth}"
            )
            gpt_result = call_openai(instructions, prompt, model="gpt-3.5-turbo")
            try:
                current_population = int(gpt_result)
            except (ValueError, TypeError):
                break
            loop_depth += 1

        results.append({
            "location": location,
            "population": current_population,
        })

    return jsonify({"results": results})
