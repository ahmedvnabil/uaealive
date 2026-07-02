"""Treasure-hunt models: stops, badges and per-device check-ins."""

import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class HuntStop(Base):
    __tablename__ = "hunt_stops"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    poi_slug: Mapped[str] = mapped_column(String(120), index=True)
    title_ar: Mapped[str] = mapped_column(String(255))
    title_en: Mapped[str] = mapped_column(String(255))
    hint_ar: Mapped[str] = mapped_column(String(1000))
    hint_en: Mapped[str] = mapped_column(String(1000))
    code: Mapped[str] = mapped_column(String(60))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    checkins: Mapped[list["HuntCheckin"]] = relationship(
        back_populates="stop", cascade="all, delete-orphan"
    )


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name_ar: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    icon: Mapped[str | None] = mapped_column(String(255), nullable=True)
    threshold: Mapped[int] = mapped_column(Integer, default=1)


class HuntCheckin(Base):
    __tablename__ = "hunt_checkins"
    __table_args__ = (UniqueConstraint("device_id", "stop_id", name="uq_checkin_device_stop"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_id: Mapped[str] = mapped_column(String(64), index=True)
    stop_id: Mapped[int] = mapped_column(ForeignKey("hunt_stops.id", ondelete="CASCADE"))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    stop: Mapped["HuntStop"] = relationship(back_populates="checkins")
