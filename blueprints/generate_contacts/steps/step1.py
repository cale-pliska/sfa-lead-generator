import io
import pandas as pd
from flask import request

from .. import generate_contacts_bp
from ..utils import data_store


@generate_contacts_bp.route('/upload', methods=['POST'])
def upload():
    """Load TSV data sent from the client and store it."""
    tsv_text = request.form.get('tsv_text', '').strip()
    if not tsv_text:
        return 'No TSV data provided', 400

    f = io.StringIO(tsv_text)
    data_store.DATAFRAME = pd.read_csv(f, sep='\t', index_col=None)
    return data_store.DATAFRAME.to_json(orient='records')
