"""Treasure-hunt endpoints: stops, idempotent code check-ins, badges and progress."""

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import DbSession
from app.models import Badge, HuntCheckin, HuntStop
from app.schemas.common import envelope
from app.schemas.hunt import BadgeOut, CheckinIn, HuntStopOut

router = APIRouter(prefix="/api/v1/hunt", tags=["hunt"])

DeviceIdQuery = Annotated[str, Query(min_length=8, max_length=64)]


def _found_count(db: Session, device_id: str) -> int:
    query = (
        select(func.count())
        .select_from(HuntCheckin)
        .where(HuntCheckin.device_id == device_id)
    )
    return db.scalar(query) or 0


def _newly_earned_badge(db: Session, previous: int, current: int) -> BadgeOut | None:
    badge = db.scalar(
        select(Badge)
        .where(Badge.threshold > previous, Badge.threshold <= current)
        .order_by(Badge.threshold.desc())
    )
    return BadgeOut.from_model(badge) if badge else None


def _record_checkin(db: Session, device_id: str, stop_id: int) -> BadgeOut | None:
    """Insert the check-in once; returns a badge only when a threshold is newly crossed."""
    previous = _found_count(db, device_id)
    try:
        db.add(HuntCheckin(device_id=device_id, stop_id=stop_id))
        db.commit()
    except IntegrityError:
        db.rollback()  # concurrent duplicate — treat as already checked in
        return None
    return _newly_earned_badge(db, previous, previous + 1)


@router.get("/stops")
def list_stops(db: DbSession) -> dict:
    stops = db.scalars(select(HuntStop).order_by(HuntStop.sort_order, HuntStop.id)).all()
    return envelope([HuntStopOut.from_model(stop) for stop in stops])


@router.post("/checkin")
def checkin(payload: CheckinIn, db: DbSession) -> dict:
    total = db.scalar(select(func.count()).select_from(HuntStop)) or 0
    code = payload.code.strip().upper()
    stop = db.scalar(select(HuntStop).where(func.upper(HuntStop.code) == code))
    if stop is None:
        found = _found_count(db, payload.device_id)
        return envelope({"correct": False, "progress": {"found": found, "total": total}})

    already = db.scalar(
        select(HuntCheckin).where(
            HuntCheckin.device_id == payload.device_id, HuntCheckin.stop_id == stop.id
        )
    )
    badge = None if already else _record_checkin(db, payload.device_id, stop.id)

    data: dict = {
        "correct": True,
        "stop": HuntStopOut.from_model(stop),
        "progress": {"found": _found_count(db, payload.device_id), "total": total},
    }
    if badge is not None:
        data["badge"] = badge
    return envelope(data)


@router.get("/progress")
def progress(device_id: DeviceIdQuery, db: DbSession) -> dict:
    found = db.scalars(
        select(HuntStop.slug)
        .join(HuntCheckin, HuntCheckin.stop_id == HuntStop.id)
        .where(HuntCheckin.device_id == device_id)
        .order_by(HuntStop.sort_order, HuntStop.id)
    ).all()
    badges = db.scalars(
        select(Badge).where(Badge.threshold <= len(found)).order_by(Badge.threshold)
    ).all()
    return envelope({"found": list(found), "badges": [BadgeOut.from_model(b) for b in badges]})
