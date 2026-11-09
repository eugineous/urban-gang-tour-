"""Read an owned, public post through yt-dlp's pinned logged-out extractor.

Capture its public product metadata before video-only filtering so pictures and
every carousel child are retained. Never accept browser cookies or login flags.
"""
import json
import re
import sys
from urllib.parse import urlparse

from yt_dlp import YoutubeDL
from yt_dlp.extractor.instagram import InstagramIE

ACCOUNT = "urban_newsgang"


class Captured(Exception):
    def __init__(self, value):
        self.value = value


def media_fields(value):
    return {key: value[key] for key in (
        "pk", "id", "media_type", "width", "height", "video_versions",
        "image_versions2", "has_audio", "video_duration", "video_codec",
        "carousel_media_count", "more_available",
    ) if key in value}


class OwnedPublicInstagramIE(InstagramIE):
    @property
    def _can_impersonate(self):
        return False

    def _extract_product(self, product_info, video_id=None, get_comments=False):
        product = product_info[0] if isinstance(product_info, list) else product_info
        if product.get("user", {}).get("username") != ACCOUNT:
            raise ValueError("different_instagram_account")
        value = media_fields(product)
        value.update({
            "code": video_id or product.get("code"),
            "user": {"username": ACCOUNT},
            "caption": {"text": product.get("caption", {}).get("text", "")}
            if isinstance(product.get("caption"), dict) else {"text": ""},
            "taken_at": product.get("taken_at"),
        })
        if isinstance(product.get("carousel_media"), list):
            value["carousel_media"] = [media_fields(child) for child in product["carousel_media"]]
        raise Captured(value)


def main():
    if len(sys.argv) != 2:
        raise ValueError("one_owned_post_url_required")
    url = urlparse(sys.argv[1])
    if (url.scheme != "https" or url.hostname not in ("www.instagram.com", "instagram.com")
            or url.username or url.password or url.port or url.query or url.fragment
            or not re.fullmatch(r"/urban_newsgang/(?:p|reel)/[A-Za-z0-9_-]{5,28}/", url.path)):
        raise ValueError("only_owned_public_posts_allowed")
    with YoutubeDL({"quiet": True, "no_warnings": True, "skip_download": True,
                    "cachedir": False, "cookiefile": None, "cookiesfrombrowser": None,
                    "usenetrc": False, "socket_timeout": 20, "retries": 0,
                    "extractor_retries": 0, "getcomments": False}) as downloader:
        try:
            OwnedPublicInstagramIE(downloader).extract(sys.argv[1])
        except Captured as result:
            print(json.dumps(result.value, ensure_ascii=False))
            return
    raise ValueError("public_metadata_unavailable")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Do not leak provider responses, signed media URLs or ambient details.
        message = "rate_limited" if "429" in str(error) else "owned_public_metadata_unavailable"
        print("[instagram] " + message + "; no login bypass attempted", file=sys.stderr)
        sys.exit(1)
