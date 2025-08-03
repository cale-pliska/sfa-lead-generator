import pandas as pd

# Simple in-memory storage for the uploaded DataFrame
# Using a module-level variable keeps the state shared across blueprints

# Initially there is no data loaded
DATAFRAME: pd.DataFrame | None = None
