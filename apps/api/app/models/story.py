"""Story model — bilingual narrative variants per POI and audience."""

from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.poi import Poi


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    poi_id: Mapped[int] = mapped_column(
        ForeignKey("pois.id", ondelete="CASCADE"), index=True
    )
    audience: Mapped[str] = mapped_column(String(30), index=True)
    title_ar: Mapped[str] = mapped_column(String(255))
    title_en: Mapped[str] = mapped_column(String(255))
    body_ar: Mapped[str] = mapped_column(Text)
    body_en: Mapped[str] = mapped_column(Text)
    sources: Mapped[list[Any]] = mapped_column(JSONB, default=list)

    poi: Mapped["Poi"] = relationship(back_populates="stories")
