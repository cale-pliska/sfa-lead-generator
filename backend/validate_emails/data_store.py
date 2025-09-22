"""Simple in-memory storage for uploaded data used by the validate emails page."""

from __future__ import annotations

from typing import Any

import pandas as pd

# Module level DataFrame used to persist data between requests for this feature.
DATAFRAME: pd.DataFrame | None = None


# Additional state tracked while validating emails.  The structure is a
# dictionary with the following keys:
#
# ``column``
#     The column selected for validation.
# ``status_counter`` and ``validity_counter``
#     ``collections.Counter`` instances tracking the aggregated results.
# ``processed_indices``
#     A ``set[int]`` of row indices that have been processed at least once.
# ``total``
#     The total number of rows in the uploaded data set.
VALIDATION_STATE: dict[str, Any] | None = None


def reset_validation_state() -> None:
    """Clear any cached validation state."""

    global VALIDATION_STATE
    VALIDATION_STATE = None
