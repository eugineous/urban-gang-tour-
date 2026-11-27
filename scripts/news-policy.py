"""Shared intake exclusions for paid promotions, gambling and adult material."""
import json
from pathlib import Path
import re
import unicodedata

terms = json.loads((Path(__file__).resolve().parent.parent / 'data' / 'urban-news-exclusions.json').read_text())['terms']
EXCLUDED = re.compile(r'(?<!\w)(?:' + '|'.join(re.escape(term) for term in terms) + r')(?!\w)', re.I)

def blocked(*values):
    return any(EXCLUDED.search(' '.join(unicodedata.normalize('NFKC', value).split())) for value in values if value)
