"""In-memory storage for the guess contact generation method."""

import pandas as pd

# Separate storage from the simple method so each workflow can run independently.
DATAFRAME: pd.DataFrame | None = None
