"""Public POI endpoints."""

from typing import Literal

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db import DbSession
from app.models import Poi
from app.schemas.common import envelope
from app.schemas.poi import PoiDetailOut, PoiOut

router = APIRouter(prefix="/api/v1", tags=["pois"])


@router.get("/pois")
def list_pois(
    db: DbSession,
    kind: str | None = None,
    lang: Literal["ar", "en"] | None = None,
) -> dict:
    """List POIs, optionally filtered by kind.

    `lang` is accepted per the API contract for forward compatibility;
    responses are always bilingual (`{"ar", "en"}` localized fields).
    """
    query = select(Poi).order_by(Poi.sort_order, Poi.id)
    if kind:
        query = query.where(Poi.kind == kind)
    pois = db.scalars(query).all()
    return envelope([PoiOut.from_model(poi) for poi in pois])


@router.get("/pois/{slug}")
def get_poi(slug: str, db: DbSession) -> dict:
    poi = db.scalar(
        select(Poi).where(Poi.slug == slug).options(selectinload(Poi.stories))
    )
    if poi is None:
        raise HTTPException(status_code=404, detail="not_found")
    return envelope(PoiDetailOut.from_model(poi))
