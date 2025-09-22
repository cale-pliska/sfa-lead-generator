"""Simple in-memory storage for uploaded data used by the validate emails page."""

from __future__ import annotations

import pandas as pd

# Module level DataFrame used to persist data between requests for this feature.
DATAFRAME: pd.DataFrame | None = None
