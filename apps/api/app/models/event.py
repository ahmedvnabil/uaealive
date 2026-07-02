"""Cultural event model."""

import datetime

from sqlalchemy import Date, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    kind: Mapped[str] = mapped_column(String(60), index=True)
    title_ar: Mapped[str] = mapped_column(String(255))
    title_en: Mapped[str] = mapped_column(String(255))
    description_ar: Mapped[str] = mapped_column(String(2000))
    description_en: Mapped[str] = mapped_column(String(2000))
    starts_on: Mapped[datetime.date] = mapped_column(Date)
    ends_on: Mapped[datetime.date] = mapped_column(Date)
    location_ar: Mapped[str] = mapped_column(String(255))
    location_en: Mapped[str] = mapped_column(String(255))
