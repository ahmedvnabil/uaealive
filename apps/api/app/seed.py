"""Idempotent database seed from the committed data/*.json knowledge base.

Run with: python -m app.seed
Upserts by natural key (slug / key / (poi, audience)) so repeated runs
yield identical row counts.
"""

import datetime
import json
import logging
from pathlib import Path
from typing import Any

from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal
from app.models import Badge, Character, Event, HuntStop, Poi, Story, TimelinePeriod

logger = logging.getLogger("app.seed")

TABLES: dict[str, type] = {
    "pois": Poi,
    "stories": Story,
    "characters": Character,
    "timeline_periods": TimelinePeriod,
    "events": Event,
    "hunt_stops": HuntStop,
    "badges": Badge,
}


def _read_json(data_dir: Path, name: str) -> Any:
    with (data_dir / name).open(encoding="utf-8") as fh:
        return json.load(fh)


def _get_or_create(session: Session, model: type, **keys: Any) -> Any:
    obj = session.scalar(select(model).filter_by(**keys))
    if obj is None:
        obj = model(**keys)
        session.add(obj)
    return obj


def _apply(obj: Any, values: dict[str, Any]) -> None:
    for field, value in values.items():
        setattr(obj, field, value)


def _bilingual(item: dict, *fields: str) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for field in fields:
        out[f"{field}_ar"] = item[field]["ar"]
        out[f"{field}_en"] = item[field]["en"]
    return out


def seed_pois(session: Session, items: list[dict]) -> None:
    for item in items:
        poi = _get_or_create(session, Poi, slug=item["slug"])
        _apply(poi, {
            "kind": item["kind"],
            **_bilingual(item, "name", "summary"),
            "lat": item["lat"],
            "lng": item["lng"],
            "geom": WKTElement(f"POINT({item['lng']} {item['lat']})", srid=4326),
            "era_built": item.get("era_built"),
            "wheelchair": item["accessibility"]["wheelchair"],
            "audio": item["accessibility"]["audio"],
            "hero_image": item.get("hero_image"),
            "sort_order": item.get("order", 0),
        })
    session.flush()


def _poi_id_by_slug(session: Session, slug: str) -> int:
    poi_id = session.scalar(select(Poi.id).where(Poi.slug == slug))
    if poi_id is None:
        raise ValueError(f"data references unknown poi_slug {slug!r}")
    return poi_id


def seed_stories(session: Session, items: list[dict]) -> None:
    for item in items:
        poi_id = _poi_id_by_slug(session, item["poi_slug"])
        story = _get_or_create(session, Story, poi_id=poi_id, audience=item["audience"])
        _apply(story, {
            **_bilingual(item, "title", "body"),
            "sources": list(item.get("sources", [])),
        })
    session.flush()


def seed_characters(session: Session, items: list[dict]) -> None:
    for item in items:
        character = _get_or_create(session, Character, slug=item["slug"])
        _apply(character, {
            **_bilingual(item, "name", "role", "greeting"),
            "avatar": item.get("avatar"),
            "persona_prompt": item["persona_prompt"],
            "fallback_qa": list(item.get("fallback_qa", [])),
        })
    session.flush()


def seed_timeline(session: Session, items: list[dict]) -> None:
    for item in items:
        period = _get_or_create(session, TimelinePeriod, key=item["key"])
        _apply(period, {
            **_bilingual(item, "name", "description"),
            "palette": dict(item.get("palette", {})),
        })
    session.flush()


def seed_events(session: Session, items: list[dict]) -> None:
    for item in items:
        event = _get_or_create(session, Event, slug=item["slug"])
        _apply(event, {
            "kind": item["kind"],
            **_bilingual(item, "title", "description", "location"),
            "starts_on": datetime.date.fromisoformat(item["starts_on"]),
            "ends_on": datetime.date.fromisoformat(item["ends_on"]),
        })
    session.flush()


def seed_hunt(session: Session, hunt: dict) -> None:
    for item in hunt["stops"]:
        _poi_id_by_slug(session, item["poi_slug"])  # referential integrity check
        stop = _get_or_create(session, HuntStop, slug=item["slug"])
        _apply(stop, {
            "poi_slug": item["poi_slug"],
            **_bilingual(item, "title", "hint"),
            "code": item["code"],
            "sort_order": item.get("order", 0),
        })
    for item in hunt["badges"]:
        badge = _get_or_create(session, Badge, slug=item["slug"])
        _apply(badge, {
            **_bilingual(item, "name"),
            "icon": item.get("icon"),
            "threshold": item["threshold"],
        })
    session.flush()


def table_counts(session: Session) -> dict[str, int]:
    return {
        name: session.scalar(select(func.count()).select_from(model)) or 0
        for name, model in TABLES.items()
    }


def seed_all(session: Session, data_dir: Path) -> dict[str, int]:
    """Upsert every dataset; returns per-table row counts after seeding."""
    seed_pois(session, _read_json(data_dir, "pois.json"))
    seed_stories(session, _read_json(data_dir, "stories.json"))
    seed_characters(session, _read_json(data_dir, "characters.json"))
    seed_timeline(session, _read_json(data_dir, "timeline.json"))
    seed_events(session, _read_json(data_dir, "events.json"))
    seed_hunt(session, _read_json(data_dir, "hunt.json"))
    return table_counts(session)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    data_dir = Path(get_settings().data_dir)
    with SessionLocal() as session:
        counts = seed_all(session, data_dir)
        session.commit()
    logger.info("Seed complete:")
    for table, count in counts.items():
        logger.info("  %-18s %d", table, count)


if __name__ == "__main__":
    main()
