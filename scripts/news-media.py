"""Keep licensed publisher photos in the public edition with explicit attribution."""
from io import BytesIO
from pathlib import Path
import re
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from PIL import Image, ImageOps

MEDIA = '{http://search.yahoo.com/mrss/}'
LICENSE = re.compile(r'https://creativecommons\.org/(?:licenses/(?:by|by-sa)/(?:3\.0|4\.0)|publicdomain/(?:mark|zero)/1\.0)/?')
Image.MAX_IMAGE_PIXELS = 24_000_000

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *_):
        return None

def licensed_image(entry, hosts):
    for image in entry.findall(MEDIA+'content'):
        url = image.get('url', '')
        license_ = image.find(MEDIA+'license')
        credit = image.find(MEDIA+'credit')
        alt = image.find(MEDIA+'title')
        parts = urlsplit(url)
        if parts.scheme != 'https' or parts.netloc.lower() not in hosts:
            continue
        if image.get('type') not in ('image/jpeg', 'image/png', 'image/webp') or license_ is None or credit is None or alt is None:
            continue
        label = ' '.join((license_.text or '').split())
        owner = ' '.join((credit.text or '').split())
        description = ' '.join((alt.text or '').split())
        terms = license_.get('href', '')
        if not LICENSE.fullmatch(terms) or not (0 < len(label) <= 50 and 0 < len(owner) <= 180 and 0 < len(description) <= 240):
            continue
        return dict(url=url, license=terms, credit=owner, licenseLabel=label, alt=description)
    return None

def store_photo(image, key, root):
    folder = Path(root) / 'photos'
    folder.mkdir(exist_ok=True)
    try:
        req = Request(image['url'], headers={'User-Agent':'UrbanGangTourNews/1.0 (https://urbangangtour.co.ke)'})
        with build_opener(NoRedirect()).open(req, timeout=5) as response:
            if response.headers.get_content_type() not in ('image/jpeg', 'image/png', 'image/webp'):
                return None
            content = response.read(5_000_001)
        if len(content) > 5_000_000:
            return None
        picture = ImageOps.exif_transpose(Image.open(BytesIO(content))).convert('RGB')
        if picture.width < 640 or picture.height < 360:
            return None
        for width in (480, 960):
            variant = picture.copy()
            variant.thumbnail((width, 1280))
            variant.save(folder / f'{key}-{width}.webp', format='WEBP', quality=82)
        attrs={name:value for name,value in image.items() if name!='url'}
        return dict(attrs,source=image['url'])
    except (OSError, ValueError, Image.DecompressionBombError):
        return None
