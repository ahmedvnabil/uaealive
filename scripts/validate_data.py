#!/usr/bin/env python3
"""Validate the UAE ALIVE seed knowledge base (data/*.json + data/geo/*.geojson).

Checks structural shape, bilingual completeness, referential integrity, and
geographic bounds for every seed file. Exits 1 with clear messages on any
failure; prints a summary table on success.

Usage:
    python scripts/validate_data.py
"""

from __future__ import annotations

import datetime
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Broad bbox for POI anchors (includes adjacent landmarks such as
# Sheikh Saeed Al Maktoum House across the district edge).
POI_BBOX = (25.256, 55.285, 25.272, 55.310)  # lat_min, lng_min, lat_max, lng_max

# Tight bbox for the district GeoJSON (buildings, alleys, paths).
GEO_BBOX = (25.2618, 55.2975, 25.2665, 55.3025)

POI_REQUIRED_KEYS = (
    "slug",
    "kind",
    "name",
    "summary",
    "lat",
    "lng",
    "era_built",
    "accessibility",
    "hero_image",
    "order",
)

AUDIENCES = {"tourist", "kids", "expert"}
TIMELINE_KEYS = ("1950", "1970", "1990", "today")
PALETTE_KEYS = ("sky", "ambient", "accent")
HEX_RE = re.compile(r"#[0-9A-Fa-f]{6}")

# POIs allowed to have fewer than the 3 audience story variants.
# None expected in v1 — every POI (including adjacent landmarks) ships with
# tourist + kids + expert stories. Add slugs here only with justification.
STORY_EXCEPTIONS: set[str] = set()

errors: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def is_bilingual(value: Any) -> bool:
    """True if value is {"ar": non-empty str, "en": non-empty str}."""
    return (
        isinstance(value, dict)
        and isinstance(value.get("ar"), str)
        and value["ar"].strip() != ""
        and isinstance(value.get("en"), str)
        and value["en"].strip() != ""
    )


def require_bilingual(obj: dict, field: str, where: str) -> None:
    if not is_bilingual(obj.get(field)):
        fail(f"{where}: field '{field}' is not a non-empty {{ar, en}} object")


def in_bbox(lat: float, lng: float, bbox: tuple[float, float, float, float]) -> bool:
    lat_min, lng_min, lat_max, lng_max = bbox
    return lat_min <= lat <= lat_max and lng_min <= lng <= lng_max


def load_json(path: Path) -> Any:
    try:
        with path.open(encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        fail(f"{path.relative_to(DATA_DIR.parent)}: file is missing")
    except json.JSONDecodeError as exc:
        fail(f"{path.relative_to(DATA_DIR.parent)}: invalid JSON — {exc}")
    return None


def check_pois(pois: Any) -> list[str]:
    """Validate pois.json; return the list of valid POI slugs."""
    if not isinstance(pois, list):
        fail("pois.json: top level must be a JSON array")
        return []
    if len(pois) < 15:
        fail(f"pois.json: expected >= 15 POIs, found {len(pois)}")
    slugs: list[str] = []
    for i, poi in enumerate(pois):
        where = f"pois[{i}] ({poi.get('slug', '?')})"
        for key in POI_REQUIRED_KEYS:
            if key not in poi:
                fail(f"{where}: missing required key '{key}'")
        require_bilingual(poi, "name", where)
        require_bilingual(poi, "summary", where)
        lat, lng = poi.get("lat"), poi.get("lng")
        if not (isinstance(lat, (int, float)) and isinstance(lng, (int, float))):
            fail(f"{where}: lat/lng must be numbers")
        elif not in_bbox(lat, lng, POI_BBOX):
            fail(f"{where}: ({lat}, {lng}) outside POI bbox {POI_BBOX}")
        acc = poi.get("accessibility")
        if not (
            isinstance(acc, dict)
            and isinstance(acc.get("wheelchair"), bool)
            and isinstance(acc.get("audio"), bool)
        ):
            fail(f"{where}: accessibility must be {{wheelchair: bool, audio: bool}}")
        slug = poi.get("slug")
        if isinstance(slug, str) and slug:
            slugs.append(slug)
    dupes = [s for s, n in Counter(slugs).items() if n > 1]
    if dupes:
        fail(f"pois.json: duplicate slugs {dupes}")
    return slugs


def check_stories(stories: Any, poi_slugs: list[str]) -> int:
    if not isinstance(stories, list):
        fail("stories.json: top level must be a JSON array")
        return 0
    coverage: dict[str, set[str]] = {}
    for i, story in enumerate(stories):
        where = f"stories[{i}] ({story.get('poi_slug', '?')})"
        poi_slug = story.get("poi_slug")
        if poi_slug not in poi_slugs:
            fail(f"{where}: poi_slug '{poi_slug}' not found in pois.json")
        audience = story.get("audience")
        if audience not in AUDIENCES:
            fail(f"{where}: audience '{audience}' not in {sorted(AUDIENCES)}")
        require_bilingual(story, "title", where)
        require_bilingual(story, "body", where)
        sources = story.get("sources")
        if not (
            isinstance(sources, list)
            and sources
            and all(isinstance(s, str) and s.strip() for s in sources)
        ):
            fail(f"{where}: sources must be a non-empty list of strings")
        if isinstance(poi_slug, str) and isinstance(audience, str):
            coverage.setdefault(poi_slug, set()).add(audience)
    for slug in poi_slugs:
        if slug in STORY_EXCEPTIONS:
            continue
        missing = AUDIENCES - coverage.get(slug, set())
        if missing:
            fail(f"stories.json: POI '{slug}' missing audiences {sorted(missing)}")
    return len(stories)


def check_characters(characters: Any) -> int:
    if not isinstance(characters, list):
        fail("characters.json: top level must be a JSON array")
        return 0
    if len(characters) != 5:
        fail(f"characters.json: expected exactly 5 characters, found {len(characters)}")
    for i, char in enumerate(characters):
        where = f"characters[{i}] ({char.get('slug', '?')})"
        for field in ("name", "role", "greeting"):
            require_bilingual(char, field, where)
        persona = char.get("persona_prompt")
        if not (isinstance(persona, str) and persona.strip()):
            fail(f"{where}: persona_prompt must be a non-empty string")
        qa = char.get("fallback_qa")
        if not (isinstance(qa, list) and len(qa) >= 8):
            found = len(qa) if isinstance(qa, list) else "none"
            fail(f"{where}: fallback_qa must have >= 8 entries (found {found})")
            continue
        for j, pair in enumerate(qa):
            kw = pair.get("keywords") if isinstance(pair, dict) else None
            if not (isinstance(kw, list) and kw):
                fail(f"{where}.fallback_qa[{j}]: keywords must be a non-empty list")
            if not is_bilingual(pair.get("a") if isinstance(pair, dict) else None):
                fail(f"{where}.fallback_qa[{j}]: 'a' must be a non-empty {{ar, en}}")
    return len(characters) if isinstance(characters, list) else 0


def check_timeline(timeline: Any) -> int:
    if not isinstance(timeline, list):
        fail("timeline.json: top level must be a JSON array")
        return 0
    keys = [p.get("key") for p in timeline]
    if sorted(map(str, keys)) != sorted(TIMELINE_KEYS):
        fail(f"timeline.json: keys must be exactly {TIMELINE_KEYS}, found {keys}")
    for i, period in enumerate(timeline):
        where = f"timeline[{i}] ({period.get('key', '?')})"
        require_bilingual(period, "name", where)
        require_bilingual(period, "description", where)
        palette = period.get("palette")
        if not isinstance(palette, dict):
            fail(f"{where}: palette must be an object")
            continue
        for pk in PALETTE_KEYS:
            value = palette.get(pk, "")
            if not (isinstance(value, str) and HEX_RE.fullmatch(value)):
                fail(f"{where}: palette.{pk} must be a #RRGGBB hex, found '{value}'")
    return len(timeline)


def check_events(events: Any) -> int:
    if not isinstance(events, list):
        fail("events.json: top level must be a JSON array")
        return 0
    if len(events) < 6:
        fail(f"events.json: expected >= 6 events, found {len(events)}")
    for i, event in enumerate(events):
        where = f"events[{i}] ({event.get('slug', '?')})"
        for field in ("title", "description", "location"):
            require_bilingual(event, field, where)
        dates: dict[str, datetime.date] = {}
        for field in ("starts_on", "ends_on"):
            raw = event.get(field)
            try:
                dates[field] = datetime.date.fromisoformat(raw)
            except (TypeError, ValueError):
                fail(f"{where}: {field} is not a valid ISO date: '{raw}'")
        if len(dates) == 2 and dates["ends_on"] < dates["starts_on"]:
            fail(f"{where}: ends_on precedes starts_on")
    return len(events)


def check_hunt(hunt: Any, poi_slugs: list[str]) -> tuple[int, int]:
    if not isinstance(hunt, dict):
        fail("hunt.json: top level must be an object with 'stops' and 'badges'")
        return 0, 0
    stops = hunt.get("stops")
    badges = hunt.get("badges")
    if not (isinstance(stops, list) and len(stops) >= 6):
        found = len(stops) if isinstance(stops, list) else "none"
        fail(f"hunt.json: expected >= 6 stops, found {found}")
        stops = stops if isinstance(stops, list) else []
    codes: list[str] = []
    for i, stop in enumerate(stops):
        where = f"hunt.stops[{i}] ({stop.get('slug', '?')})"
        if stop.get("poi_slug") not in poi_slugs:
            fail(f"{where}: poi_slug '{stop.get('poi_slug')}' not in pois.json")
        require_bilingual(stop, "title", where)
        require_bilingual(stop, "hint", where)
        code = stop.get("code")
        if not (isinstance(code, str) and len(code) == 6):
            fail(f"{where}: code must be a 6-character string, found '{code}'")
        else:
            codes.append(code)
    dupes = [c for c, n in Counter(codes).items() if n > 1]
    if dupes:
        fail(f"hunt.json: duplicate stop codes {dupes}")
    if not (isinstance(badges, list) and len(badges) >= 4):
        found = len(badges) if isinstance(badges, list) else "none"
        fail(f"hunt.json: expected >= 4 badges, found {found}")
        badges = badges if isinstance(badges, list) else []
    for i, badge in enumerate(badges):
        where = f"hunt.badges[{i}] ({badge.get('slug', '?')})"
        require_bilingual(badge, "name", where)
        if not isinstance(badge.get("threshold"), int):
            fail(f"{where}: threshold must be an integer")
    return len(stops), len(badges)


def iter_coords(geometry: dict) -> list[tuple[float, float]]:
    """Flatten any GeoJSON geometry into a list of (lng, lat) pairs."""
    gtype = geometry.get("type")
    coords = geometry.get("coordinates", [])
    if gtype == "Point":
        return [(coords[0], coords[1])]
    if gtype in ("LineString", "MultiPoint"):
        return [(c[0], c[1]) for c in coords]
    if gtype in ("Polygon", "MultiLineString"):
        return [(c[0], c[1]) for ring in coords for c in ring]
    if gtype == "MultiPolygon":
        return [(c[0], c[1]) for poly in coords for ring in poly for c in ring]
    fail(f"geojson: unsupported geometry type '{gtype}'")
    return []


def check_geojson(fc: Any) -> tuple[int, Counter]:
    if not (isinstance(fc, dict) and fc.get("type") == "FeatureCollection"):
        fail("alfahidi.geojson: top level must be a FeatureCollection")
        return 0, Counter()
    features = fc.get("features", [])
    if len(features) < 120:
        fail(f"alfahidi.geojson: expected >= 120 features, found {len(features)}")
    kinds: Counter = Counter()
    for i, feature in enumerate(features):
        if feature.get("type") != "Feature":
            fail(f"alfahidi.geojson: features[{i}] is not type 'Feature'")
            continue
        kind = feature.get("properties", {}).get("kind")
        kinds[kind] += 1
        if kind == "boundary":  # boundary may extend past the tight bbox
            continue
        for lng, lat in iter_coords(feature.get("geometry", {})):
            if not in_bbox(lat, lng, GEO_BBOX):
                fail(
                    f"alfahidi.geojson: features[{i}] (kind={kind}) has "
                    f"coordinate ({lat}, {lng}) outside bbox {GEO_BBOX}"
                )
                break
    return len(features), kinds


def main() -> int:
    files = {
        "pois": DATA_DIR / "pois.json",
        "stories": DATA_DIR / "stories.json",
        "characters": DATA_DIR / "characters.json",
        "timeline": DATA_DIR / "timeline.json",
        "events": DATA_DIR / "events.json",
        "hunt": DATA_DIR / "hunt.json",
        "geo": DATA_DIR / "geo" / "alfahidi.geojson",
    }
    parsed = {name: load_json(path) for name, path in files.items()}
    if errors:  # missing/corrupt files — no point checking shapes
        for message in errors:
            print(f"FAIL {message}", file=sys.stderr)
        return 1

    poi_slugs = check_pois(parsed["pois"])
    n_stories = check_stories(parsed["stories"], poi_slugs)
    n_chars = check_characters(parsed["characters"])
    n_periods = check_timeline(parsed["timeline"])
    n_events = check_events(parsed["events"])
    n_stops, n_badges = check_hunt(parsed["hunt"], poi_slugs)
    n_features, geo_kinds = check_geojson(parsed["geo"])

    if errors:
        print(f"\nvalidate_data: {len(errors)} problem(s) found\n", file=sys.stderr)
        for message in errors:
            print(f"FAIL {message}", file=sys.stderr)
        return 1

    kinds_str = ", ".join(f"{k}={v}" for k, v in sorted(geo_kinds.items()))
    rows = [
        ("POIs", str(len(poi_slugs)), "all bilingual, in bbox, unique slugs"),
        ("Stories", str(n_stories), "3 audiences x every POI, sourced"),
        ("Characters", str(n_chars), "persona + >=8 fallback QA each"),
        ("Timeline", str(n_periods), "1950/1970/1990/today, hex palettes"),
        ("Events", str(n_events), "bilingual, valid ISO date ranges"),
        ("Hunt stops", str(n_stops), f"unique 6-char codes, {n_badges} badges"),
        ("Geo features", str(n_features), kinds_str),
    ]
    width = max(len(r[0]) for r in rows)
    print("validate_data: ALL CHECKS PASSED\n")
    print(f"  {'Dataset'.ljust(width)}  Count  Detail")
    print(f"  {'-' * width}  -----  {'-' * 40}")
    for name, count, detail in rows:
        print(f"  {name.ljust(width)}  {count.rjust(5)}  {detail}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
