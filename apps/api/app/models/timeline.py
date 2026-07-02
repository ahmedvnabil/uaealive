"""Timeline period model for the digital-twin era slider."""

from typing import Any

from sqlalchemy import Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class TimelinePeriod(Base):
    __tablename__ = "timeline_periods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    name_ar: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    description_ar: Mapped[str] = mapped_column(String(2000))
    description_en: Mapped[str] = mapped_column(String(2000))
    palette: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
