"""Routes supporting the validate emails workflow."""

from __future__ import annotations

import io
import json
import os
from collections import Counter
from typing import Any

import pandas as pd
import requests
from flask import Blueprint, jsonify, render_template, request

from . import data_store

API_URL = "https://verify.gmass.co/verify"

validate_emails_bp = Blueprint("validate_emails", __name__)


def _resolve_email_column(df: pd.DataFrame, requested_column: str | None) -> str | None:
    """Return the column to use for email addresses, if available."""

    if df.empty:
        return None

    if requested_column and requested_column in df.columns:
        return requested_column

    for column in df.columns:
        if column.lower() == "email":
            return column

    return None


def _serialize_result(result: dict[str, Any]) -> str:
    """Serialize the GMass API response for storage inside the DataFrame."""

    return json.dumps(result, ensure_ascii=False)


@validate_emails_bp.route("/validate_emails")
def page() -> str:
    """Render the validate emails page."""

    return render_template("validate_emails.html")


@validate_emails_bp.route("/validate_emails/upload", methods=["POST"])
def upload() -> tuple[str, int] | str:
    """Load TSV data sent from the client and store it for later processing."""

    tsv_text = request.form.get("tsv_text", "").strip()
    if not tsv_text:
        return "No TSV data provided", 400

    data_frame = pd.read_csv(io.StringIO(tsv_text), sep="\t", index_col=None)
    data_store.DATAFRAME = data_frame
    return data_frame.to_json(orient="records")


@validate_emails_bp.route("/validate_emails/validate", methods=["POST"])
def validate_emails() -> tuple[Any, int] | Any:
    """Validate email addresses using the GMass verification API."""

    if data_store.DATAFRAME is None:
        return jsonify({"error": "No data loaded"}), 400

    payload = request.get_json(silent=True) or {}
    requested_column = payload.get("column") if isinstance(payload, dict) else None

    data_frame = data_store.DATAFRAME
    column = _resolve_email_column(data_frame, requested_column)
    if column is None:
        return (
            jsonify(
                {
                    "error": "Email column not found",
                    "columns": list(data_frame.columns),
                }
            ),
            400,
        )

    api_key = os.getenv("GMASS_API_KEY")
    if not api_key:
        return jsonify({"error": "GMASS_API_KEY is not configured"}), 500

    results: list[dict[str, Any]] = []
    status_counter: Counter[str] = Counter()
    valid_counter: Counter[str] = Counter()

    for _, value in data_frame[column].fillna("").items():
        email = str(value).strip()
        if not email:
            result: dict[str, Any] = {
                "Success": False,
                "Valid": False,
                "Status": "EmptyEmail",
            }
        else:
            try:
                response = requests.get(
                    API_URL,
                    params={"email": email, "key": api_key},
                    timeout=30,
                )
                response.raise_for_status()
                result = response.json()
            except (requests.RequestException, ValueError) as exc:
                result = {
                    "Success": False,
                    "Valid": False,
                    "Status": "RequestError",
                    "Error": str(exc),
                }

        results.append(result)
        status = str(result.get("Status") or "Unknown")
        status_counter[status] += 1
        valid_value = result.get("Valid")
        if valid_value is True:
            valid_counter["valid"] += 1
        elif valid_value is False:
            valid_counter["invalid"] += 1
        else:
            valid_counter["unknown"] += 1

    serialized_results = [_serialize_result(result) for result in results]
    data_frame = data_frame.copy()
    data_frame["email_verification"] = serialized_results
    data_store.DATAFRAME = data_frame

    summary = {
        "total": len(results),
        "status_counts": dict(status_counter),
        "validity_counts": dict(valid_counter),
        "selected_column": column,
    }

    return jsonify(
        {
            "records": data_frame.to_dict(orient="records"),
            "summary": summary,
        }
    )
