#!/usr/bin/env python3
"""One-shot generator for data/geo/alfahidi.geojson (UAE ALIVE, Task 2).

Fetches real OpenStreetMap geometry for the Al Fahidi Historical District
(Al Bastakiya, Bur Dubai) from the Overpass API and normalizes it into the
FeatureCollection contract used by the map (/map) and digital twin (/twin):

    buildings  {"kind": "building", "height": <m>, "barjeel": bool, "poi_slug"?: str}
    paths      {"kind": "alley"} for footway/pedestrian/path, {"kind": "path"} for service
    boundary   {"kind": "boundary"} — one convex-ish polygon around the buildings

Usage:
    python scripts/fetch_osm.py [--out data/geo/alfahidi.geojson] [--raw cache.json]

The output file is committed; the app never calls Overpass at runtime.
Map data (c) OpenStreetMap contributors, ODbL 1.0 — openstreetmap.org/copyright.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

# South, West, North, East — the historic quarter between Al Fahidi Street
# and the Dubai Creek edge.
BBOX = (25.2618, 55.2975, 25.2665, 55.3025)

OVERPASS_ENDPOINTS = (
    "https://overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
)
USER_AGENT = "uaealive-fetch-osm/1.0 (Al Fahidi heritage platform; one-shot data build)"

OVERPASS_QUERY = """[out:json][timeout:90];
(
  way["building"]({bbox});
  way["highway"~"footway|pedestrian|path|service"]({bbox});
);
out geom;"""

DEFAULT_HEIGHT_M = 5.0
LANDMARK_HEIGHT_M = 9.0
METERS_PER_LEVEL = 3.2
BARJEEL_TARGET = 25
POI_SNAP_RADIUS_M = 40.0

# POI anchor coordinates, resolved by name via Overpass/Nominatim on
# 2026-07-02 (OSM element ids noted for provenance). The Majlis Gallery is
# not mapped in OSM; its anchor is the traditional courtyard house at the
# district's western entrance by Al Fahidi Roundabout (its street address).
POI_ANCHORS: tuple[tuple[str, float, float], ...] = (
    ("coffee-museum", 25.263708, 55.300098),  # node/5334433325 "Coffee Museum"
    ("smccu", 25.264143, 55.300721),  # way/524486371 Sheikh Mohammed Centre
    ("coins-museum", 25.264582, 55.299793),  # node/12486010908 "Coins Museum"
    ("xva-gallery", 25.264116, 55.299661),  # node/5154973021 XVA Art Hotel & Gallery
    ("arabian-tea-house", 25.263351, 55.299720),  # way/260895322 "Arabian Tea House"
    ("majlis-gallery", 25.263180, 55.298350),  # address-based, see note above
    ("calligraphy-house", 25.264276, 55.300860),  # node/12486010926
    ("al-fahidi-mosque", 25.264837, 55.299554),  # way/175192793 Al Bastakiya Mosque
)

LANDMARK_TAG_KEYS = ("heritage", "historic", "tourism")
LAT_M = 111_320.0  # meters per degree of latitude (equirectangular)


def fetch_overpass(query: str, attempts: int = 10) -> dict:
    """POST a query to Overpass, rotating mirrors with backoff."""
    body = urllib.parse.urlencode({"data": query}).encode()
    last_error: Exception | None = None
    for attempt in range(attempts):
        endpoint = OVERPASS_ENDPOINTS[attempt % len(OVERPASS_ENDPOINTS)]
        request = urllib.request.Request(
            endpoint, data=body, headers={"User-Agent": USER_AGENT}
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as error:  # noqa: BLE001 — mirrors fail in many ways
            last_error = error
            print(
                f"  overpass attempt {attempt + 1} via {endpoint}: {error}",
                file=sys.stderr,
            )
            time.sleep(min(4 * (attempt + 1), 30))
    raise RuntimeError(
        f"Overpass API unreachable after {attempts} attempts: {last_error}"
    )


def meters_per_lon_degree() -> float:
    mid_lat = (BBOX[0] + BBOX[2]) / 2
    return LAT_M * math.cos(math.radians(mid_lat))


def distance_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Approximate ground distance between two (lat, lon) points."""
    return math.hypot((a[0] - b[0]) * LAT_M, (a[1] - b[1]) * meters_per_lon_degree())


def clamp_point(lat: float, lon: float) -> tuple[float, float]:
    south, west, north, east = BBOX
    return (min(max(lat, south), north), min(max(lon, west), east))


def ring_centroid(ring: list[tuple[float, float]]) -> tuple[float, float]:
    pts = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def ring_area_m2(ring: list[tuple[float, float]]) -> float:
    """Signed shoelace area in square meters (positive = counterclockwise)."""
    lon_m = meters_per_lon_degree()
    clat, clon = ring_centroid(ring)
    pts = [((p[1] - clon) * lon_m, (p[0] - clat) * LAT_M) for p in ring]
    doubled = sum(
        pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
        for i in range(len(pts) - 1)
    )
    return doubled / 2.0


def to_lonlat_ring(ring: list[tuple[float, float]]) -> list[list[float]]:
    """(lat, lon) ring → rounded GeoJSON [lon, lat] ring, CCW, closed, deduped."""
    rounded = [[round(lon, 6), round(lat, 6)] for lat, lon in ring]
    deduped = [p for i, p in enumerate(rounded) if i == 0 or p != rounded[i - 1]]
    if deduped[0] != deduped[-1]:
        deduped.append(list(deduped[0]))
    if ring_area_m2([(p[1], p[0]) for p in deduped]) < 0:
        deduped.reverse()
    return deduped


def clip_segment(
    a: tuple[float, float], b: tuple[float, float]
) -> list[tuple[float, float]]:
    """Liang-Barsky clip of segment a→b (lat, lon) against BBOX. [] if outside."""
    south, west, north, east = BBOX
    d_lat, d_lon = b[0] - a[0], b[1] - a[1]
    t0, t1 = 0.0, 1.0
    for p, q in (
        (-d_lat, a[0] - south),
        (d_lat, north - a[0]),
        (-d_lon, a[1] - west),
        (d_lon, east - a[1]),
    ):
        if p == 0:
            if q < 0:
                return []
            continue
        t = q / p
        if p < 0:
            t0 = max(t0, t)
        else:
            t1 = min(t1, t)
        if t0 > t1:
            return []
    return [
        (a[0] + t0 * d_lat, a[1] + t0 * d_lon),
        (a[0] + t1 * d_lat, a[1] + t1 * d_lon),
    ]


def clip_polyline(points: list[tuple[float, float]]) -> list[list[tuple[float, float]]]:
    """Clip a polyline to BBOX, returning the pieces that remain inside."""
    pieces: list[list[tuple[float, float]]] = []
    current: list[tuple[float, float]] = []
    for a, b in zip(points, points[1:]):
        clipped = clip_segment(a, b)
        if not clipped:
            if len(current) >= 2:
                pieces.append(current)
            current = []
            continue
        start, end = clipped
        if not current:
            current = [start]
        elif distance_m(current[-1], start) > 0.5:
            if len(current) >= 2:
                pieces.append(current)
            current = [start]
        current.append(end)
    if len(current) >= 2:
        pieces.append(current)
    return pieces


def building_height(tags: dict, is_landmark: bool) -> float:
    raw_height = tags.get("height", "").replace("m", "").strip()
    try:
        if raw_height:
            return round(float(raw_height), 1)
    except ValueError:
        pass
    try:
        levels = float(tags.get("building:levels", ""))
        return round(levels * METERS_PER_LEVEL, 1)
    except ValueError:
        pass
    return LANDMARK_HEIGHT_M if is_landmark else DEFAULT_HEIGHT_M


def is_landmark_tagged(tags: dict) -> bool:
    if any(key in tags for key in LANDMARK_TAG_KEYS):
        return True
    return tags.get("amenity") == "place_of_worship"


def extract_buildings(elements: list[dict]) -> list[dict]:
    """OSM building ways → working records with clamped in-bbox rings."""
    south, west, north, east = BBOX
    buildings = []
    for element in elements:
        tags = element.get("tags", {})
        if "building" not in tags or len(element.get("geometry", [])) < 4:
            continue
        ring = [(g["lat"], g["lon"]) for g in element["geometry"]]
        centroid = ring_centroid(ring)
        if not (south <= centroid[0] <= north and west <= centroid[1] <= east):
            continue  # mapped mostly outside the district window
        clamped = [clamp_point(lat, lon) for lat, lon in ring]
        landmark = is_landmark_tagged(tags)
        buildings.append(
            {
                "osm_id": element["id"],
                "ring": clamped,
                "centroid": centroid,
                "area_m2": abs(ring_area_m2(clamped)),
                "kind_tag": tags.get("building", "yes"),
                "landmark": landmark,
                "height": building_height(tags, landmark),
                "poi_slug": None,
            }
        )
    return buildings


def assign_poi_slugs(buildings: list[dict]) -> None:
    """Attach each POI slug to the nearest unassigned building within 40 m."""
    for slug, lat, lon in POI_ANCHORS:
        candidates = [
            (distance_m(b["centroid"], (lat, lon)), b)
            for b in buildings
            if b["poi_slug"] is None and b["kind_tag"] != "roof"
        ]
        dist, nearest = min(candidates, key=lambda pair: pair[0])
        if dist <= POI_SNAP_RADIUS_M:
            nearest["poi_slug"] = slug
            nearest["landmark"] = True
            nearest["height"] = max(nearest["height"], LANDMARK_HEIGHT_M)
        else:
            print(f"  WARNING: no building within 40 m of {slug}", file=sys.stderr)


def mark_barjeel(buildings: list[dict]) -> None:
    """Flag ~25 wind-tower houses: POI + heritage-tagged first, then the tallest/largest.

    Only house-like footprints qualify (`yes`/`retail`); the mosque carries a
    minaret rather than a barjeel, and offices/apartments are modern infill.
    """
    candidates = [b for b in buildings if b["kind_tag"] in ("yes", "retail")]
    ranked = sorted(
        candidates,
        key=lambda b: (
            b["poi_slug"] is not None,
            b["landmark"],
            b["height"],
            b["area_m2"],
        ),
        reverse=True,
    )
    for building in ranked[:BARJEEL_TARGET]:
        building["barjeel"] = True


def convex_hull(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Andrew's monotone chain on (lat, lon) points; returns an open CCW hull."""
    unique = sorted(set(points))
    if len(unique) < 3:
        return unique

    def cross(o: tuple, a: tuple, b: tuple) -> float:
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower: list[tuple[float, float]] = []
    for p in unique:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper: list[tuple[float, float]] = []
    for p in reversed(unique):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def district_boundary(buildings: list[dict]) -> list[tuple[float, float]]:
    """Convex hull of building footprints, pushed ~8% outward, clamped to BBOX."""
    all_points = [point for b in buildings for point in b["ring"]]
    hull = convex_hull(all_points)
    clat = sum(p[0] for p in hull) / len(hull)
    clon = sum(p[1] for p in hull) / len(hull)
    expanded = [
        clamp_point(clat + (lat - clat) * 1.08, clon + (lon - clon) * 1.08)
        for lat, lon in hull
    ]
    return expanded + [expanded[0]]


def build_feature_collection(elements: list[dict]) -> dict:
    buildings = extract_buildings(elements)
    assign_poi_slugs(buildings)
    mark_barjeel(buildings)

    features = []
    for b in sorted(buildings, key=lambda x: x["osm_id"]):
        properties = {
            "kind": "building",
            "height": b["height"],
            "barjeel": bool(b.get("barjeel", False)),
        }
        if b["poi_slug"]:
            properties["poi_slug"] = b["poi_slug"]
        features.append(
            {
                "type": "Feature",
                "properties": properties,
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [to_lonlat_ring(b["ring"])],
                },
            }
        )

    for element in sorted(elements, key=lambda e: e["id"]):
        tags = element.get("tags", {})
        highway = tags.get("highway")
        if highway not in ("footway", "pedestrian", "path", "service"):
            continue
        kind = "path" if highway == "service" else "alley"
        line = [(g["lat"], g["lon"]) for g in element.get("geometry", [])]
        for piece in clip_polyline(line):
            coordinates = [[round(lon, 6), round(lat, 6)] for lat, lon in piece]
            deduped = [
                p
                for i, p in enumerate(coordinates)
                if i == 0 or p != coordinates[i - 1]
            ]
            if len(deduped) < 2:
                continue
            features.append(
                {
                    "type": "Feature",
                    "properties": {"kind": kind},
                    "geometry": {"type": "LineString", "coordinates": deduped},
                }
            )

    features.append(
        {
            "type": "Feature",
            "properties": {"kind": "boundary"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [to_lonlat_ring(district_boundary(buildings))],
            },
        }
    )
    return {"type": "FeatureCollection", "features": features}


def iter_coordinates(geometry: dict):
    if geometry["type"] == "LineString":
        yield from geometry["coordinates"]
    elif geometry["type"] == "Polygon":
        for ring in geometry["coordinates"]:
            yield from ring


def validate(fc: dict) -> None:
    south, west, north, east = BBOX
    features = fc["features"]
    assert len(features) >= 120, f"expected >= 120 features, got {len(features)}"
    kinds = [f["properties"]["kind"] for f in features]
    assert kinds.count("boundary") == 1, "exactly one boundary feature required"
    for feature in features:
        assert feature["type"] == "Feature"
        for lon, lat in iter_coordinates(feature["geometry"]):
            assert south <= lat <= north and west <= lon <= east, (
                f"({lat}, {lon}) outside bbox"
            )
    slugs = [
        f["properties"].get("poi_slug")
        for f in features
        if "poi_slug" in f["properties"]
    ]
    assert len(slugs) == len(set(slugs)), "duplicate poi_slug assignment"
    summary = {
        "features": len(features),
        "buildings": kinds.count("building"),
        "alleys": kinds.count("alley"),
        "paths": kinds.count("path"),
        "barjeel": sum(1 for f in features if f["properties"].get("barjeel")),
        "poi_slugs": sorted(slugs),
    }
    print(json.dumps(summary, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", default="data/geo/alfahidi.geojson", type=Path)
    parser.add_argument(
        "--raw", type=Path, help="optional path to cache the raw Overpass JSON"
    )
    args = parser.parse_args()

    print(f"Fetching Al Fahidi geometry from Overpass (bbox {BBOX}) ...")
    raw = fetch_overpass(OVERPASS_QUERY.format(bbox=",".join(str(v) for v in BBOX)))
    if args.raw:
        args.raw.write_text(json.dumps(raw))
    elements = raw.get("elements", [])
    print(f"  received {len(elements)} OSM ways")

    fc = build_feature_collection(elements)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(fc, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.out}")
    validate(json.loads(args.out.read_text(encoding="utf-8")))


if __name__ == "__main__":
    main()
