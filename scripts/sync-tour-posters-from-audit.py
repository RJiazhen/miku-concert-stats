#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Sync tour posters from temp/tour-poster-audit.md into originals + JSON.

Does not modify the audit markdown. For tours through a stop id (default
snow-miku-live-2018): download/copy each ![](image) as an original, record all
posters on the tour, fix sourcePage when sourceUrl was clearly a page URL, and
prefer the markdown image URL as sourceUrl when it differs from the field.

Usage:
  uv run scripts/sync-tour-posters-from-audit.py
  uv run scripts/sync-tour-posters-from-audit.py --through snow-miku-live-2018
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import re
import shutil
import ssl
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "temp" / "tour-poster-audit.md"
JSON_PATH = ROOT / "data" / "tour-posters.json"
ORIGINALS = ROOT / "public" / "posters" / "originals"
UA = "miku-concert-stats-poster-sync/1.0 (+https://github.com/RJiazhen/miku-concert-stats)"

# Wikia (`…/file.png/revision/…`) and Moegirl thumbs (`…/file.jpg!/fw/…`) keep
# the extension mid-path rather than at the end of the URL.
IMAGE_EXT_RE = re.compile(r"\.(jpe?g|png|webp|gif|avif|bmp|tiff?)(?:$|\?|/|!)", re.I)
PAGE_HINT_RE = re.compile(
    r"(\.html?(?:$|\?)|/wiki/|/opus/|pageView|/news/|/events/|/Cn/|/Index/)",
    re.I,
)
LEADING_URL_RE = re.compile(r"^(https?://\S+)")


def field(block: str, key: str) -> str | None:
    """Reads one `**key:** value` line from an audit tour block."""
    m = re.search(rf"\*\*{re.escape(key)}:\*\*\s*(.+)", block)
    return m.group(1).strip() if m else None


def leading_http_url(text: str) -> str | None:
    """Returns the leading http(s) token from a field that may include notes."""
    m = LEADING_URL_RE.match(text.strip())
    return m.group(1) if m else None


def looks_like_image_url(url: str) -> bool:
    """True when the URL likely points at an image asset."""
    if not url.startswith("http"):
        return False
    if IMAGE_EXT_RE.search(url):
        return True
    if "media_dl=" in url or "img.youtube.com" in url or "i.ytimg.com" in url:
        return True
    if "cloudfront.net" in url and "/full/" in url:
        return True
    if "twimg.com/media" in url:
        return True
    if "hdslb.com" in url:
        return True
    if "redd.it" in url:
        return True
    return False


def looks_like_page_url(url: str) -> bool:
    """True when the URL looks like an HTML page rather than an image file."""
    if not url.startswith("http"):
        return False
    if looks_like_image_url(url):
        return False
    if PAGE_HINT_RE.search(url):
        return True
    path = urlparse(url).path
    return path.endswith("/") or path == "" or "." not in Path(path).name


def is_remote(link: str) -> bool:
    """True for http(s) image/page links."""
    return link.startswith("http://") or link.startswith("https://")


def parse_audit(through: str) -> list[tuple[str, str]]:
    """Returns ordered (tourId, block) pairs through `through` inclusive."""
    text = AUDIT.read_text(encoding="utf-8")
    m = re.search(r"## All tours\n(.*)", text, re.S)
    if not m:
        raise SystemExit("All tours section missing")
    blocks = re.split(r"\n### `", m.group(1))
    entries: list[tuple[str, str]] = []
    for b in blocks:
        if not b.strip():
            continue
        tid = b.split("`", 1)[0]
        entries.append((tid, b))
    ids = [t for t, _ in entries]
    if through not in ids:
        raise SystemExit(f"stop id {through!r} not in audit")
    return entries[: ids.index(through) + 1]


def ext_from_bytes(data: bytes, url: str) -> str:
    """Picks a file extension from magic bytes or URL."""
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith(b"\x89PNG"):
        return ".png"
    if data.startswith(b"RIFF") and b"WEBP" in data[:16]:
        return ".webp"
    if data.startswith(b"GIF8"):
        return ".gif"
    if data.startswith(b"\x00\x00\x00") and b"ftypavif" in data[:32]:
        return ".avif"
    guess = mimetypes.guess_extension(
        mimetypes.guess_type(url.split("?", 1)[0])[0] or ""
    )
    return guess or ".bin"


def download(url: str) -> bytes:
    """Fetches URL bytes with a browser-like User-Agent."""
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
        return resp.read()


def resolve_local(link: str) -> Path | None:
    """Maps an audit-relative image path to a local file when present."""
    if is_remote(link):
        return None
    candidates = [
        ROOT / "temp" / link,
        ROOT / "temp" / Path(link).name,
        ROOT / link.lstrip("./"),
    ]
    if "tour-poster-audit.assets/" in link:
        candidates.insert(0, ROOT / "temp" / link)
    if link.startswith("../public/"):
        candidates.insert(0, ROOT / link[len("../") :])
    if "/posters/" in link:
        name = link.split("/posters/")[-1]
        candidates.append(ROOT / "public" / "posters" / name)
    for c in candidates:
        try:
            if c.is_file():
                return c
        except OSError:
            continue
    return None


def display_src(tour_id: str, index: int) -> str:
    """Public compressed preview path for poster index (1-based)."""
    if index == 1:
        return f"/posters/{tour_id}.webp"
    return f"/posters/{tour_id}-{index}.webp"


def existing_posters_list(entry: dict | None) -> list[dict]:
    """Normalizes a legacy or v2 tour poster entry to a poster list."""
    if not entry:
        return []
    if isinstance(entry.get("posters"), list):
        return entry["posters"]
    if isinstance(entry.get("src"), str):
        return [entry]
    return []


def correct_provenance(
    source_url_field: str, source_page_field: str
) -> tuple[str, str]:
    """Fixes page-in-sourceUrl mistakes without inventing image URLs.

    Returns (field_image_url_or_empty, source_page).
    """
    page = source_page_field.strip()
    raw = source_url_field.strip()
    url_part = leading_http_url(raw) or ""

    if url_part and looks_like_page_url(url_part):
        # Page URL was entered into sourceUrl (often with a trailing note).
        if not page:
            page = url_part
        return "", page

    if url_part and looks_like_image_url(url_part):
        return url_part, page

    # Non-URL notes or empty — do not invent a sourceUrl.
    return "", page


def migrate_legacy_entry(tour_id: str, entry: dict) -> dict:
    """Wraps a legacy single poster object into `{posters:[...]}`."""
    if "posters" in entry and isinstance(entry["posters"], list):
        # Ensure originalSrc exists on each poster.
        posters = []
        for i, poster in enumerate(entry["posters"], start=1):
            p = dict(poster)
            if not p.get("originalSrc"):
                p["originalSrc"] = p.get("src", "")
            if not p.get("src"):
                p["src"] = display_src(tour_id, i)
            posters.append(p)
        return {"posters": posters}

    src = entry.get("src")
    if not isinstance(src, str):
        return {"posters": []}
    public = ROOT / "public" / src.lstrip("/")
    suffix = public.suffix if public.suffix else ".bin"
    original_rel = f"/posters/originals/{tour_id}-01{suffix}"
    original_path = ROOT / "public" / original_rel.lstrip("/")
    ORIGINALS.mkdir(parents=True, exist_ok=True)
    if public.is_file() and not original_path.is_file():
        shutil.copy2(public, original_path)
    return {
        "posters": [
            {
                "src": display_src(tour_id, 1),
                "originalSrc": original_rel if original_path.is_file() else src,
                "sourceUrl": entry.get("sourceUrl", ""),
                "sourcePage": entry.get("sourcePage", ""),
                "sourceLabel": entry.get("sourceLabel", tour_id),
                "accessedAt": entry.get("accessedAt", "2026-11-28"),
                "artistCredit": entry.get("artistCredit"),
                "rightsNote": entry.get(
                    "rightsNote",
                    "Official event visual, used for identification on this unofficial catalog. Not an official endorsement.",
                ),
            }
        ]
    }


def write_original(tour_id: str, index: int, data: bytes, url_hint: str) -> Path:
    """Writes original bytes under public/posters/originals/ and returns the path."""
    ext = ext_from_bytes(data, url_hint)
    path = ORIGINALS / f"{tour_id}-{index:02d}{ext}"
    path.write_bytes(data)
    return path


def copy_original(tour_id: str, index: int, local: Path) -> Path:
    """Copies a local file into originals/ and returns the destination path."""
    ext = local.suffix.lower() or ".bin"
    path = ORIGINALS / f"{tour_id}-{index:02d}{ext}"
    shutil.copy2(local, path)
    return path


def sync_tour(tour_id: str, block: str, existing: dict | None) -> dict:
    """Builds one tour poster entry from an audit block."""
    source_url_field = field(block, "sourceUrl (image)") or field(block, "sourceUrl") or ""
    source_page_field = field(block, "sourcePage") or ""
    source_label = field(block, "sourceLabel") or field(block, "name") or tour_id
    accessed = field(block, "accessedAt") or "2026-11-28"
    artist = field(block, "artistCredit")
    if artist == "null":
        artist = None
    if artist is None and existing:
        # Preserve prior credit when the audit block omits artistCredit.
        prior = existing_posters_list(existing)
        if prior and prior[0].get("artistCredit"):
            artist = prior[0]["artistCredit"]
    rights = (
        "Official event visual, used for identification on this unofficial catalog. "
        "Not an official endorsement."
    )
    imgs = re.findall(r"!\[[^\]]*\]\(([^)]+)\)", block)
    if not imgs:
        if existing:
            return migrate_legacy_entry(tour_id, existing)
        return {"posters": []}

    field_image_url, page_for_all = correct_provenance(source_url_field, source_page_field)
    posters: list[dict] = []
    ORIGINALS.mkdir(parents=True, exist_ok=True)

    for i, img in enumerate(imgs, start=1):
        img = img.strip()
        local = resolve_local(img)
        local_is_packaged = False
        if local is not None:
            try:
                rel = local.resolve().relative_to((ROOT / "public" / "posters").resolve())
                local_is_packaged = rel.parts[0] != "originals"
            except ValueError:
                local_is_packaged = False

        # Provenance: remote markdown image wins over the field when they differ.
        if is_remote(img) and looks_like_image_url(img):
            record_source_url = img
            preferred_download = img
            prefer_local_first = False
        elif field_image_url:
            record_source_url = field_image_url
            preferred_download = field_image_url
            # Curated audit/temp captures beat scaled CDN thumbs; packaged
            # public previews do not count as originals.
            prefer_local_first = local is not None and not local_is_packaged
        else:
            record_source_url = ""
            preferred_download = ""
            prefer_local_first = local is not None

        original_path: Path | None = None

        if prefer_local_first and local is not None:
            original_path = copy_original(tour_id, i, local)
        elif preferred_download:
            try:
                data = download(preferred_download)
                original_path = write_original(tour_id, i, data, preferred_download)
            except (urllib.error.URLError, TimeoutError, ValueError) as err:
                print(f"  WARN {tour_id}#{i}: download failed {preferred_download}: {err}")

        if original_path is None and local is not None:
            original_path = copy_original(tour_id, i, local)
        elif original_path is None and is_remote(img) and img != preferred_download:
            try:
                data = download(img)
                original_path = write_original(tour_id, i, data, img)
                if not record_source_url and looks_like_image_url(img):
                    record_source_url = img
            except (urllib.error.URLError, TimeoutError, ValueError) as err:
                print(f"  WARN {tour_id}#{i}: download failed {img}: {err}")

        if original_path is None:
            # Last resort: existing packaged poster under public/posters/{tourId}.*
            alts = sorted((ROOT / "public" / "posters").glob(f"{tour_id}.*"))
            alts = [p for p in alts if p.is_file() and p.parent.name == "posters"]
            if alts:
                original_path = copy_original(tour_id, i, alts[0])
                print(f"  WARN {tour_id}#{i}: fell back to packaged {alts[0].name}")
            else:
                print(f"  WARN {tour_id}#{i}: no local or remote source for {img}")
                continue

        posters.append(
            {
                "src": display_src(tour_id, i),
                "originalSrc": f"/posters/originals/{original_path.name}",
                "sourceUrl": record_source_url,
                "sourcePage": page_for_all,
                "sourceLabel": source_label,
                "accessedAt": accessed,
                "artistCredit": artist,
                "rightsNote": rights,
            }
        )
        print(
            f"  ok {tour_id}#{i} → {original_path.name} "
            f"sourceUrl={record_source_url[:80] or '(none)'} "
            f"sourcePage={page_for_all[:60]}"
        )

    return {"posters": posters}


def main() -> None:
    """CLI entry: sync audit focus tours, migrate the rest."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--through", default="snow-miku-live-2018")
    args = parser.parse_args()

    focus = parse_audit(args.through)
    old = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    old_tours: dict = old.get("tours", {})
    new_tours: dict = {}

    print(f"Syncing {len(focus)} tours through {args.through}")
    for tour_id, block in focus:
        print(tour_id)
        new_tours[tour_id] = sync_tour(tour_id, block, old_tours.get(tour_id))

    focus_ids = {t for t, _ in focus}
    for tour_id, entry in old_tours.items():
        if tour_id in focus_ids:
            continue
        new_tours[tour_id] = migrate_legacy_entry(tour_id, entry)
        print(f"migrate {tour_id}")

    out = {
        "version": 2,
        "note": (
            "Tour posters: originals under public/posters/originals/; packaged "
            "WebP previews under public/posters/ via `vp run posters:package`. "
            "Each tour may list multiple posters; the UI shows the first until "
            "a multi-poster view exists. Lookup: 演出 → data/tours.json → tour id."
        ),
        "tours": new_tours,
    }
    JSON_PATH.write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Wrote {JSON_PATH} ({len(new_tours)} tours)")


if __name__ == "__main__":
    main()
