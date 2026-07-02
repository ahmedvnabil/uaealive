"""Public event endpoints."""

import datetime

from fastapi import APIRouter
from sqlalchemy import select

from app.db import DbSession
from app.models import Event
from app.schemas.common import envelope
from app.schemas.event import EventOut

router = APIRouter(prefix="/api/v1", tags=["events"])


@router.get("/events")
def list_events(db: DbSession, upcoming: bool = False) -> dict:
    query = select(Event).order_by(Event.starts_on, Event.id)
    if upcoming:
        query = query.where(Event.ends_on >= datetime.date.today())
    events = db.scalars(query).all()
    return envelope([EventOut.from_model(event) for event in events])
