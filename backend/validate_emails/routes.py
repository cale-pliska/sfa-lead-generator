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


def _initialize_validation_state(
    column: str, total_rows: int, force_reset: bool = False
) -> dict[str, Any]:
    """Ensure a validation state dictionary exists and matches the dataset."""

    state = data_store.VALIDATION_STATE
    if (
        force_reset
        or state is None
        or state.get("column") != column
        or state.get("total") != total_rows
    ):
        state = {
            "column": column,
            "status_counter": Counter(),
            "validity_counter": Counter(),
            "processed_indices": set(),
            "total": total_rows,
        }
        data_store.VALIDATION_STATE = state
    return state


def _update_counters(state: dict[str, Any], result: dict[str, Any], delta: int) -> None:
    """Update aggregate counters for a single validation result."""

    status_counter: Counter[str] = state["status_counter"]
    validity_counter: Counter[str] = state["validity_counter"]

    status_key = str(result.get("Status") or "Unknown")
    status_counter[status_key] += delta
    if status_counter[status_key] <= 0:
        del status_counter[status_key]

    valid_value = result.get("Valid")
    if valid_value is True:
        validity_key = "valid"
    elif valid_value is False:
        validity_key = "invalid"
    else:
        validity_key = "unknown"

    validity_counter[validity_key] += delta
    if validity_counter[validity_key] <= 0:
        del validity_counter[validity_key]


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
    data_store.reset_validation_state()
    return data_frame.to_json(orient="records")


@validate_emails_bp.route("/validate_emails/validate", methods=["POST"])
def validate_emails() -> tuple[Any, int] | Any:
    """Validate email addresses using the GMass verification API."""

    if data_store.DATAFRAME is None:
        return jsonify({"error": "No data loaded"}), 400

    payload_raw = request.get_json(silent=True)
    payload = payload_raw if isinstance(payload_raw, dict) else {}
    requested_column = payload.get("column")

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

    total_rows = len(data_frame)
    if total_rows == 0:
        empty_response = {
            "batch": {"start": 0, "stop": 0, "records": []},
            "summary": {
                "total": 0,
                "status_counts": {},
                "validity_counts": {},
                "selected_column": column,
                "overall_total": 0,
            },
            "progress": {"processed": 0, "total": 0, "completed": True},
        }
        return jsonify(empty_response)

    start_raw = payload.get("start")
    stop_raw = payload.get("stop")
    reset_requested = bool(payload.get("reset"))
    return_full_dataset = False

    if start_raw is None or stop_raw is None:
        start = 0
        stop = total_rows
        reset_requested = True
        return_full_dataset = True
    else:
        try:
            start = int(start_raw)
            stop = int(stop_raw)
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid start/stop values"}), 400

    if start < 0 or start >= total_rows:
        return jsonify({"error": "Start index out of range"}), 400
    if stop <= start or stop > total_rows:
        return jsonify({"error": "Stop index out of range"}), 400

    api_key = os.getenv("GMASS_API_KEY")
    if not api_key:
        return jsonify({"error": "GMASS_API_KEY is not configured"}), 500

    if reset_requested:
        data_frame = data_frame.drop(columns=["email_verification"], errors="ignore")
        data_frame = data_frame.copy()
        data_frame["email_verification"] = None
    elif "email_verification" not in data_frame.columns:
        data_frame = data_frame.copy()
        data_frame["email_verification"] = None
    else:
        # Ensure we do not modify a view of the underlying data.
        data_frame = data_frame.copy()

    data_store.DATAFRAME = data_frame

    state = _initialize_validation_state(column, total_rows, reset_requested)
    processed_indices: set[int] = state["processed_indices"]
    email_column_position = data_frame.columns.get_loc(column)
    result_column_position = data_frame.columns.get_loc("email_verification")

    batch_records: list[dict[str, Any]] = []

    for position in range(start, stop):
        if position in processed_indices:
            previous_value = data_frame.iat[position, result_column_position]
            if isinstance(previous_value, str) and previous_value:
                try:
                    previous_result = json.loads(previous_value)
                except (TypeError, ValueError):
                    previous_result = None
                if isinstance(previous_result, dict):
                    _update_counters(state, previous_result, -1)
            processed_indices.discard(position)

        value = data_frame.iat[position, email_column_position]
        if value is None or pd.isna(value):
            email = ""
        else:
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

        serialized_result = _serialize_result(result)
        data_frame.iat[position, result_column_position] = serialized_result
        processed_indices.add(position)
        _update_counters(state, result, 1)

    batch_slice = data_frame.iloc[start:stop]
    for offset, (_, row) in enumerate(batch_slice.iterrows()):
        record = row.to_dict()
        record["__index"] = start + offset
        batch_records.append(record)

    data_store.DATAFRAME = data_frame

    summary = {
        "total": len(processed_indices),
        "status_counts": dict(state["status_counter"]),
        "validity_counts": dict(state["validity_counter"]),
        "selected_column": column,
        "overall_total": total_rows,
    }

    progress = {
        "processed": len(processed_indices),
        "total": total_rows,
        "completed": len(processed_indices) >= total_rows,
        "batch_start": start,
        "batch_stop": stop,
    }

    response_payload: dict[str, Any] = {
        "batch": {"start": start, "stop": stop, "records": batch_records},
        "summary": summary,
        "progress": progress,
    }

    if return_full_dataset:
        response_payload["records"] = data_frame.to_dict(orient="records")

    return jsonify(response_payload)
