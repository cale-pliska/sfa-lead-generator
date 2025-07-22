from flask import Blueprint, jsonify, request
import pandas as pd

from processing import apply_prompt_to_dataframe, apply_prompt_to_row
from tools import get_step4_tool

step4_bp = Blueprint("step4", __name__, url_prefix="/step4")


@step4_bp.route("/process", methods=["POST"])
def process():
    """Apply a prompt to each contact row from Step 3."""
    prompt = request.json.get("prompt", "")
    instructions = request.json.get("instructions", "")
    contacts = request.json.get("contacts", [])

    df = pd.DataFrame(contacts)
    tool = get_step4_tool()
    results = apply_prompt_to_dataframe(df, instructions, prompt, tools=[tool])
    return jsonify(results)


@step4_bp.route("/process_single", methods=["POST"])
def process_single():
    """Process a single contact row."""
    prompt = request.json.get("prompt", "")
    instructions = request.json.get("instructions", "")
    contact = request.json.get("contact")

    if contact is None:
        return "No contact provided", 400

    row = pd.Series(contact)
    tool = get_step4_tool()
    result = apply_prompt_to_row(row, instructions, prompt, tools=[tool])
    new_row = {**contact, "result": result}
    return jsonify(new_row)
