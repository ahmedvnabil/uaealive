"""Admin API: content CRUD, submission moderation, analytics summary (Bearer-protected)."""

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import Base, DbSession
from app.models import AnalyticsEvent, Event, Poi, Story, Submission
from app.schemas.common import envelope
from app.schemas.event import EventIn, EventOut
from app.schemas.poi import PoiIn, PoiOut
from app.schemas.story import StoryIn, StoryOut
from app.schemas.submission import SubmissionAdminOut
from app.security import require_admin

router = APIRouter(
    prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(require_admin)]
)

TOP_POIS_LIMIT = 10


def _apply(obj: Any, values: dict[str, Any]) -> None:
    for field, value in values.items():
        setattr(obj, field, value)


def _get_or_404(db: Session, model: type[Base], obj_id: int) -> Any:
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="not_found")
    return obj


def _ensure_unique_slug(
    db: Session, model: type[Base], slug: str, exclude_id: int | None = None
) -> None:
    query = select(model.id).where(model.slug == slug)
    if exclude_id is not None:
        query = query.where(model.id != exclude_id)
    if db.scalar(query) is not None:
        raise HTTPException(status_code=409, detail="conflict")


def _delete(db: Session, model: type[Base], obj_id: int) -> dict:
    obj = _get_or_404(db, model, obj_id)
    db.delete(obj)
    db.commit()
    return envelope({"deleted": True})


def _save(db: Session, obj: Any) -> None:
    db.add(obj)
    db.commit()
    db.refresh(obj)


# --- POIs ---------------------------------------------------------------------------


@router.post("/pois")
def create_poi(payload: PoiIn, db: DbSession) -> dict:
    _ensure_unique_slug(db, Poi, payload.slug)
    poi = Poi()
    _apply(poi, payload.to_values())
    _save(db, poi)
    return envelope(PoiOut.from_model(poi))


@router.put("/pois/{poi_id}")
def update_poi(poi_id: int, payload: PoiIn, db: DbSession) -> dict:
    poi = _get_or_404(db, Poi, poi_id)
    _ensure_unique_slug(db, Poi, payload.slug, exclude_id=poi_id)
    _apply(poi, payload.to_values())
    _save(db, poi)
    return envelope(PoiOut.from_model(poi))


@router.delete("/pois/{poi_id}")
def delete_poi(poi_id: int, db: DbSession) -> dict:
    return _delete(db, Poi, poi_id)


# --- Stories ------------------------------------------------------------------------


def _poi_id_for_slug(db: Session, poi_slug: str) -> int:
    poi_id = db.scalar(select(Poi.id).where(Poi.slug == poi_slug))
    if poi_id is None:
        raise HTTPException(status_code=404, detail="not_found")
    return poi_id


@router.post("/stories")
def create_story(payload: StoryIn, db: DbSession) -> dict:
    story = Story()
    _apply(story, payload.to_values(_poi_id_for_slug(db, payload.poi_slug)))
    _save(db, story)
    return envelope(StoryOut.from_model(story))


@router.put("/stories/{story_id}")
def update_story(story_id: int, payload: StoryIn, db: DbSession) -> dict:
    story = _get_or_404(db, Story, story_id)
    _apply(story, payload.to_values(_poi_id_for_slug(db, payload.poi_slug)))
    _save(db, story)
    return envelope(StoryOut.from_model(story))


@router.delete("/stories/{story_id}")
def delete_story(story_id: int, db: DbSession) -> dict:
    return _delete(db, Story, story_id)


# --- Events -------------------------------------------------------------------------


@router.post("/events")
def create_event(payload: EventIn, db: DbSession) -> dict:
    _ensure_unique_slug(db, Event, payload.slug)
    event = Event()
    _apply(event, payload.to_values())
    _save(db, event)
    return envelope(EventOut.from_model(event))


@router.put("/events/{event_id}")
def update_event(event_id: int, payload: EventIn, db: DbSession) -> dict:
    event = _get_or_404(db, Event, event_id)
    _ensure_unique_slug(db, Event, payload.slug, exclude_id=event_id)
    _apply(event, payload.to_values())
    _save(db, event)
    return envelope(EventOut.from_model(event))


@router.delete("/events/{event_id}")
def delete_event(event_id: int, db: DbSession) -> dict:
    return _delete(db, Event, event_id)


# --- Submission moderation ------------------------------------------------------------


@router.get("/submissions")
def list_submissions(
    db: DbSession,
    status: Literal["pending", "approved", "rejected"] | None = None,
) -> dict:
    query = select(Submission).order_by(Submission.created_at.desc(), Submission.id.desc())
    if status:
        query = query.where(Submission.status == status)
    submissions = db.scalars(query).all()
    return envelope([SubmissionAdminOut.from_model(item) for item in submissions])


def _moderate(db: Session, submission_id: int, status: str) -> dict:
    submission = _get_or_404(db, Submission, submission_id)
    submission.status = status
    db.commit()
    return envelope({"id": submission.id, "status": submission.status})


@router.post("/submissions/{submission_id}/approve")
def approve_submission(submission_id: int, db: DbSession) -> dict:
    return _moderate(db, submission_id, "approved")


@router.post("/submissions/{submission_id}/reject")
def reject_submission(submission_id: int, db: DbSession) -> dict:
    return _moderate(db, submission_id, "rejected")


# --- Analytics summary -----------------------------------------------------------------


def _group_counts(db: Session, key: str, limit: int | None = None) -> list[dict]:
    field = AnalyticsEvent.meta[key].astext
    query = (
        select(field.label("value"), func.count().label("count"))
        .where(field.isnot(None))
        .group_by(field)
        .order_by(func.count().desc(), field.asc())
    )
    if limit is not None:
        query = query.limit(limit)
    return [{key: value, "count": count} for value, count in db.execute(query)]


@router.get("/analytics/summary")
def analytics_summary(db: DbSession) -> dict:
    total = db.scalar(select(func.count()).select_from(AnalyticsEvent)) or 0
    chat_messages = (
        db.scalar(
            select(func.count())
            .select_from(AnalyticsEvent)
            .where(AnalyticsEvent.event == "chat_message")
        )
        or 0
    )
    return envelope({
        "total_events": total,
        "by_page": _group_counts(db, "page"),
        "top_pois": _group_counts(db, "poi", limit=TOP_POIS_LIMIT),
        "by_lang": _group_counts(db, "lang"),
        "chat_messages": chat_messages,
    })
