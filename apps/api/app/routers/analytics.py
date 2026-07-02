"""Anonymous analytics tracking endpoint."""

from fastapi import APIRouter, Request

from app.db import DbSession
from app.limits import limiter
from app.models import AnalyticsEvent
from app.schemas.analytics import TrackIn
from app.schemas.common import envelope

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

TRACK_RATE_LIMIT = "60/minute"


@router.post("/track")
@limiter.limit(TRACK_RATE_LIMIT)
def track(request: Request, payload: TrackIn, db: DbSession) -> dict:
    db.add(
        AnalyticsEvent(device_id=payload.device_id, event=payload.event, meta=payload.meta)
    )
    db.commit()
    return envelope({"tracked": True})
