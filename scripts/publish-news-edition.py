"""Publish attributed short briefs from the collected, allowlisted entertainment feeds."""
import hashlib
import json
import os
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
import re
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo

OUTLETS = {
    'KE': ('The Standard Entertainment', {'www.standardmedia.co.ke', 'www.tnx.africa'}),
    'UG': ('Matooke Republic', {'www.matookerepublic.com'}),
    'NG': ('NotJustOk', {'notjustok.com'}),
    'GB': ('BBC News', {'www.bbc.co.uk', 'www.bbc.com'}),
}
SENSITIVE = re.compile(
    r'\b(arrest\w*|accus\w*|alleg\w*|arbitrat\w*|charged|crime\w*|police|lawsuit\w*|died|dies|death|murder\w*|'
    r'shooting\w*|guns|protest\w*|scandal\w*|controvers\w*|rumou?r\w*|assault\w*|trag\w*|minor\w*|children|suicid\w*|leak\w*|'
    r'politic\w*|president\w*|minister\w*|campaign\w*|election\w*|state house)\b', re.I
)
TOPICS = [
    ('Music', re.compile(r'\b(album|song|singer|artist|rapper|music|lyrics|tour|band|playlist|concert|performance)\w*\b', re.I)),
    ('Screen', re.compile(r'\b(film|cinema|actor|actress|hollywood|netflix|television|series|show|studio)\w*\b', re.I)),
    ('Culture', re.compile(r'\b(festival|book|theatre|theater|fashion|award|comedy|art|culture|literature)\w*\b', re.I)),
]
def adapt(title, publisher):
    """Publish only when a supported headline gives enough facts for an original brief."""
    lyrics = re.fullmatch(r'(.{1,95}?) Lyrics by (.{1,90})', title, re.I)
    if lyrics:
        song, performers = lyrics.groups()
        performers = re.sub(r'\s+Feat\.\s+', ' with ', performers, flags=re.I)
        return (f'{performers} on the music desk with “{song}”',
                f'“{song}” is in our music briefing. {publisher} features the track and credits {performers}. '
                'The source below has the song’s lyrics.')
    concert = re.fullmatch(r'(.+?) to host (.+?)[’\']s [‘“](.+?)[’”] Concert(?: as singer celebrates (.+))?', title, re.I)
    if concert:
        venue, artist, event, milestone = concert.groups()
        extra = f' The concert marks {milestone}, the outlet reports.' if milestone else ''
        return (f'{artist} is bringing “{event}” to {venue}',
                f'{venue} will host {artist} for a concert called “{event}”, according to {publisher}.'+extra)
    sponsor = re.fullmatch(r'(.+?) backs (.+?)[’\']s [‘\'](.+?)[’\'] (.+?) concert', title, re.I)
    if sponsor:
        sponsor, artist, event, city = sponsor.groups()
        return (f'{artist} lands backing for its {city} concert',
                f'{sponsor} is backing “{event}”, the {city} concert by {artist}, according to {publisher}.')
    departures = re.fullmatch(r'(.+?) will not return for new (.+?) series', title, re.I)
    if departures:
        cast, broadcaster = departures.groups()
        return (f'{broadcaster} series is returning with changes to the cast',
                f'{cast} are sitting out the new series, {publisher} reports.')
    award = re.fullmatch(r'(.+?) wins (.+?) prize', title, re.I)
    if award:
        entry, prize = award.groups()
        return (f'A {prize} prize for {entry[0].lower()+entry[1:]}',
                f'{publisher} reports that the award went to {entry[0].lower()+entry[1:]}.')
    return None

NAIROBI = ZoneInfo('Africa/Nairobi')
now = datetime.now(NAIROBI)
limit = int(os.environ.get('UGT_DAILY_BRIEFS', '10'))
if not 1 <= limit <= 15:
    raise ValueError('Daily target must be 1–15')
root = Path(sys.argv[1])
data = json.loads((root / 'feeds.json').read_text())
editions = root / 'editions'
editions.mkdir(exist_ok=True)
day = now.date().isoformat()
today = editions / f'{day}.json'
drafts_by_market = {}
seen = set()
stories = []

# Preserve a story's first edition and URL across repeated imports.
for age in range(7):
    file = editions / f'{now.date() - timedelta(days=age)}.json'
    if file.exists():
        edition = json.loads(file.read_text())
        seen.update(item['id'] for item in edition['stories'])
        if age == 0:
            stories = edition['stories']

for market, (publisher, hosts) in OUTLETS.items():
    xml = data['press'].get(market, '')
    if not xml or '<!DOCTYPE' in xml.upper():
        continue
    candidates = []
    for entry in ET.fromstring(xml).findall('./channel/item'):
        reported = ' '.join((entry.findtext('title') or '').split())
        topic = next((label for label, pattern in TOPICS if pattern.search(reported)), None)
        if not topic or not 12 <= len(reported) <= 190 or SENSITIVE.search(reported):
            continue
        adapted = adapt(reported, publisher)
        if not adapted:
            continue
        headline, body = adapted
        try:
            date = parsedate_to_datetime(entry.findtext('pubDate', ''))
            parts = urlsplit(entry.findtext('link', ''))
        except (TypeError, ValueError):
            continue
        if not now - timedelta(days=2) <= date <= now + timedelta(minutes=1):
            continue
        if parts.scheme != 'https' or parts.netloc.lower() not in hosts or parts.path in ('', '/'):
            continue
        query = [(key, value) for key, value in parse_qsl(parts.query) if key in ('id', 'p') and value.isdigit()]
        url = urlunsplit(('https', parts.hostname, parts.path.rstrip('/'), urlencode(query), ''))
        story_id = hashlib.sha256(url.encode()).hexdigest()[:24]
        if story_id in seen:
            continue
        seen.add(story_id)
        candidates.append(dict(id=story_id, country=market, topic=topic, publisher=publisher, url=url,
                               headline=headline, body=body, sourceHeadline=reported, sourceDate=date.isoformat(), publishedAt=now.isoformat()))
    drafts_by_market[market] = sorted(candidates, key=lambda story: story['sourceDate'], reverse=True)

for offset in range(max((len(group) for group in drafts_by_market.values()), default=0)):
    for group in drafts_by_market.values():
        if len(stories) < limit and offset < len(group):
            stories.append(group[offset])

if stories:
    today.write_text(json.dumps(dict(day=day, stories=stories), ensure_ascii=False, separators=(',', ':')))
recent = []
for age in range(3):
    date = (now.date() - timedelta(days=age)).isoformat()
    file = editions / f'{date}.json'
    if file.exists():
        recent.extend(json.loads(file.read_text())['stories'])
(root / 'latest-briefs.json').write_text(json.dumps(recent, ensure_ascii=False, separators=(',', ':')))
if len(sys.argv) > 2 and sys.argv[2] != '-':
    Path(sys.argv[2]).write_text(json.dumps(recent, ensure_ascii=False, separators=(',', ':')))
