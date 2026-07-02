"""Point-of-interest model."""

from typing import TYPE_CHECKING, Any

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.story import Story


class Poi(Base):
    __tablename__ = "pois"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    kind: Mapped[str] = mapped_column(String(60), index=True)
    name_ar: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    summary_ar: Mapped[str] = mapped_column(String(2000))
    summary_en: Mapped[str] = mapped_column(String(2000))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    geom: Mapped[Any | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=True
    )
    era_built: Mapped[str | None] = mapped_column(String(120), nullable=True)
    wheelchair: Mapped[bool] = mapped_column(Boolean, default=False)
    audio: Mapped[bool] = mapped_column(Boolean, default=False)
    hero_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    stories: Mapped[list["Story"]] = relationship(
        back_populates="poi", cascade="all, delete-orphan"
    )
