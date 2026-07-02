"""Public story endpoints."""

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.db import DbSession
from app.models import Poi, Story
from app.schemas.common import envelope
from app.schemas.story import StoryOut

router = APIRouter(prefix="/api/v1", tags=["stories"])


@router.get("/stories")
def list_stories(
    db: DbSession,
    poi: str | None = None,
    audience: str | None = None,
) -> dict:
    query = select(Story).options(joinedload(Story.poi)).order_by(Story.id)
    if poi:
        query = query.join(Story.poi).where(Poi.slug == poi)
    if audience:
        query = query.where(Story.audience == audience)
    stories = db.scalars(query).all()
    return envelope([StoryOut.from_model(story) for story in stories])
