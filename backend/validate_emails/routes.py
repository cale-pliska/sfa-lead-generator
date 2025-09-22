from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Optional

from flask import Blueprint, jsonify, request

from . import data_store

validate_emails_bp = Blueprint(
    "validate_emails", __name__, url_prefix="/validate_emails"
)

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _to_string(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _extract_email_from_row(row: Any) -> str:
    if row is None:
        return ""
    if isinstance(row, str):
        return row.strip()
    if isinstance(row, (list, tuple)):
        for item in row:
            candidate = _extract_email_from_row(item)
            if candidate:
                return candidate
        return ""
    if isinstance(row, dict):
        if "email" in row:
            return _to_string(row["email"])
        if "Email" in row:
            return _to_string(row["Email"])
        for key, value in row.items():
            if "email" in key.lower():
                candidate = _extract_email_from_row(value)
                if candidate:
                    return candidate
    return ""


def _build_partial_dataset_from_indexes(
    start: int, stop: int
) -> List[Dict[str, Any]]:
    dataset = data_store.get_dataset()
    stop = min(stop, len(dataset))
    subset: List[Dict[str, Any]] = []
    for index in range(start, stop):
        subset.append({"index": index, "value": _extract_email_from_row(dataset[index])})
    return subset


def _validate_single(email_value: Any) -> Dict[str, Any]:
    email = _to_string(email_value)
    if not email:
        return {
            "email": email,
            "status": "missing",
            "reason": "No email provided",
        }

    if not EMAIL_REGEX.match(email):
        return {
            "email": email,
            "status": "invalid",
            "reason": "Email format is invalid",
        }

    local_part, domain = email.split("@", 1)
    if not local_part or not domain:
        return {
            "email": email,
            "status": "invalid",
            "reason": "Email format is invalid",
        }

    if domain.startswith("-") or domain.endswith("-"):
        return {
            "email": email,
            "status": "invalid",
            "reason": "Domain format appears invalid",
        }

    return {
        "email": email,
        "status": "valid",
        "reason": "Address format looks correct",
        "domain": domain.lower(),
    }


def _prepare_payload_entries(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    emails: Optional[Iterable[Any]] = payload.get("emails")
    if emails is None:
        start = payload.get("start")
        stop = payload.get("stop")
        if start is not None and stop is not None:
            try:
                start_int = int(start)
                stop_int = int(stop)
            except (TypeError, ValueError):
                raise ValueError("start and stop must be integers")
            if stop_int <= start_int:
                raise ValueError("stop must be greater than start")
            emails = _build_partial_dataset_from_indexes(start_int, stop_int)
        else:
            emails = []

    prepared: List[Dict[str, Any]] = []
    for item in emails:
        if isinstance(item, dict):
            index = item.get("index")
            try:
                index_int = int(index)
            except (TypeError, ValueError):
                index_int = None
            prepared.append({
                "index": index_int,
                "value": item.get("value") or item.get("email"),
            })
        else:
            prepared.append({"index": None, "value": item})
    return prepared


@validate_emails_bp.route("/validate", methods=["POST"])
def validate_emails() -> Any:
    payload = request.get_json(silent=True) or {}

    try:
        entries = _prepare_payload_entries(payload)
    except ValueError as exc:  # pragma: no cover - defensive
        return jsonify({"error": str(exc)}), 400

    total_count = payload.get("total_count")
    if total_count is not None:
        try:
            total_count = int(total_count)
        except (TypeError, ValueError):
            return jsonify({"error": "total_count must be an integer"}), 400

    if payload.get("dataset"):
        data_store.set_dataset(payload["dataset"], total=total_count)
    elif total_count is not None:
        data_store.set_total(total_count)

    if not entries:
        progress = data_store.get_progress(total_override=total_count)
        return (
            jsonify(
                {
                    "results": {},
                    "progress": progress,
                    "error": "No email entries supplied",
                }
            ),
            400,
        )

    partial_results: Dict[int, Dict[str, Any]] = {}
    for position, entry in enumerate(entries):
        index = entry.get("index")
        try:
            index_int = int(index) if index is not None else None
        except (TypeError, ValueError):
            index_int = None
        result = _validate_single(entry.get("value"))
        if index_int is None:
            index_int = -1 - position
        result["index"] = index_int
        partial_results[index_int] = result

    data_store.upsert_results(partial_results)
    progress = data_store.get_progress(total_override=total_count)

    response_results = {str(idx): data for idx, data in partial_results.items()}
    return jsonify({"results": response_results, "progress": progress})


__all__ = ["validate_emails_bp"]
