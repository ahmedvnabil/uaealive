"""Public timeline endpoint."""

from fastapi import APIRouter
from sqlalchemy import select

from app.db import DbSession
from app.models import TimelinePeriod
from app.schemas.common import envelope
from app.schemas.timeline import PeriodOut

router = APIRouter(prefix="/api/v1", tags=["timeline"])


@router.get("/timeline")
def list_timeline(db: DbSession) -> dict:
    periods = db.scalars(select(TimelinePeriod).order_by(TimelinePeriod.id)).all()
    return envelope([PeriodOut.from_model(period) for period in periods])
