"""Collect public entertainment posts through the X API when a credential is configured."""
import json
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler

token = os.environ.get('X_BEARER_TOKEN', '')
if not token:
    print('X feed disabled. No bearer credential configured.')
    sys.exit(0)

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *_):
        return None

query = {
    'query': '("Kenyan music" OR "Kenya entertainment" OR "Nairobi concert") -is:retweet -is:reply',
    'max_results': '10',
    'tweet.fields': 'created_at,author_id',
    'expansions': 'author_id',
    'user.fields': 'username',
}
def collect():
    request = Request('https://api.x.com/2/tweets/search/recent?'+urlencode(query), headers={'Authorization':'Bearer '+token})
    with build_opener(NoRedirect()).open(request, timeout=8) as response:
        payload = response.read(100_001)
    if len(payload) > 100_000: return []
    obj = json.loads(payload)
    users = {u['id']:u['username'] for u in obj.get('includes',{}).get('users',[])}
    posts=[]
    for item in obj.get('data',[]):
        user = users.get(item.get('author_id'), '')
        id_ = item.get('id', '')
        if not re.fullmatch(r'[A-Za-z0-9_]{1,15}', user) or not re.fullmatch(r'\d{8,25}', id_):
            continue
        posts.append(dict(url=f'https://x.com/{user}/status/{id_}',user=user,date=item['created_at']))
    return posts[:6]
try:
    posts=collect()
    Path(sys.argv[1], 'x-entertainment.json').write_text(json.dumps(posts,separators=(',',':')))
    print(f'X links collected: {len(posts)}.')
except (HTTPError, URLError, KeyError, TypeError, ValueError) as error:
    print(f'X API unavailable ({getattr(error, "code", type(error).__name__)}).')
