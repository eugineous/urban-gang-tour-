"""Capture public chart facts and attributed RSS headline metadata for the reader fallback."""
import concurrent.futures
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET

MEDIA = '{http://search.yahoo.com/mrss/}'

MARKETS = 'ke ug tz so gb us se nl kz in ng za gh rw'.split()
PRESS = {
    'KE': 'https://www.standardmedia.co.ke/rss/entertainment.php',
    'UG': 'https://www.matookerepublic.com/category/entertainment/feed/',
    'NG': 'https://notjustok.com/feed/',
    'GB': 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    'TZ': 'https://feeds.bbci.co.uk/swahili/rss.xml',
    'SO': 'https://feeds.bbci.co.uk/somali/rss.xml',
}
FIELDS = ('id', 'artistName', 'name', 'kind', 'url')

def collect(job):
    kind, country, url = job
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'UrbanNewsFeedReader/1.0'})
        with urllib.request.urlopen(req, timeout=12) as response:
            if response.geturl() != url:
                raise ValueError('redirect')
            payload = response.read(2_000_001)
        if len(payload) > 2_000_000:
            raise ValueError('size')
        if kind == 'charts':
            feed = json.loads(payload)['feed']
            if feed['id'] != url or feed['country'] != country.lower() or not 1 <= len(feed['results']) <= 10:
                raise ValueError('source identity')
            result = {key: feed[key] for key in ('id', 'country', 'updated')}
            result['results'] = [{key: row.get(key) for key in FIELDS} for row in feed['results']]
            return kind, country, {'feed': result}
        if b'<!DOCTYPE' in payload.upper():
            raise ValueError('DTD')
        channel = ET.SubElement(root := ET.Element('rss'), 'channel')
        for entry in ET.fromstring(payload).findall('./channel/item')[:15]:
            item = ET.SubElement(channel, 'item')
            for key in ('title', 'link', 'pubDate'):
                ET.SubElement(item, key).text = (entry.findtext(key) or '')[:900]
            for original in entry.findall(MEDIA+'content')[:3]:
                media = ET.SubElement(item, MEDIA+'content', {key:original.get(key, '')[:1000] for key in ('type','url')})
                for name in ('license','credit','title'):
                    field = original.find(MEDIA+name)
                    if field is not None:
                        field_copy=ET.SubElement(media,MEDIA+name,{'href':field.get('href','')[:1000]})
                        field_copy.text=(field.text or '')[:300]
        if not len(channel):
            raise ValueError('empty feed')
        return kind, country, ET.tostring(root, encoding='unicode')
    except (ValueError, KeyError, TypeError, OSError, ET.ParseError) as error:
        print(f'{kind} {country}: {type(error).__name__}', file=sys.stderr)
        return kind, country, None

if __name__ == '__main__':
    jobs = [('charts', country.upper(), f'https://rss.marketingtools.apple.com/api/v2/{country}/music/most-played/10/songs.json') for country in MARKETS]
    jobs.extend(('press', country, url) for country, url in PRESS.items())
    try:
        with open(sys.argv[1]) as previous:
            data = json.load(previous)
    except FileNotFoundError:
        data = {'charts': {}, 'press': {}}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        for kind, country, value in pool.map(collect, jobs):
            if value:
                data[kind][country] = value
    if not data['charts'].get('KE') or not data['press']:
        raise RuntimeError('No Kenya chart or publisher headlines available')
    with open(sys.argv[1], 'w') as out:
        json.dump(data, out, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
