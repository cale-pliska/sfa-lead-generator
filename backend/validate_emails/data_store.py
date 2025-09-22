from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional

_STATE: Dict[str, Any] = {
    "dataset": [],
    "results": {},
    "total": None,
}


def reset() -> None:
    """Clear all stored data."""
    _STATE["dataset"] = []
    _STATE["results"] = {}
    _STATE["total"] = None


def set_dataset(rows: Iterable[Any], total: Optional[int] = None) -> None:
    """Persist the dataset that will be validated."""
    _STATE["dataset"] = list(rows)
    _STATE["results"] = {}
    _STATE["total"] = len(_STATE["dataset"]) if total is None else total


def get_dataset() -> List[Any]:
    return list(_STATE.get("dataset", []))


def upsert_results(entries: Dict[int, Any]) -> None:
    stored = _STATE.setdefault("results", {})
    for raw_index, payload in entries.items():
        try:
            index = int(raw_index)
        except (TypeError, ValueError):
            continue
        stored[index] = payload


def get_results() -> Dict[int, Any]:
    return dict(_STATE.get("results", {}))


def set_total(total: Optional[int]) -> None:
    _STATE["total"] = total


def get_total() -> Optional[int]:
    total = _STATE.get("total")
    if total is None:
        dataset = _STATE.get("dataset") or []
        if dataset:
            return len(dataset)
    return total


def get_progress(total_override: Optional[int] = None) -> Dict[str, Any]:
    if total_override is not None:
        set_total(total_override)
    total = get_total()
    results = _STATE.get("results", {})
    processed = len(results)
    remaining = None
    complete = False
    if total is not None:
        remaining = max(total - processed, 0)
        complete = processed >= total
    return {
        "total": total,
        "processed": processed,
        "remaining": remaining,
        "complete": complete,
    }
