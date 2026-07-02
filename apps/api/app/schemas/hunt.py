"""Treasure-hunt DTOs (stop listings never expose the secret codes)."""

from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

from app.schemas.common import Localized, loc

if TYPE_CHECKING:
    from app.models.hunt import Badge, HuntStop


class HuntStopOut(BaseModel):
    id: int
    slug: str
    poi_slug: str
    title: Localized
    hint: Localized
    order: int

    @classmethod
    def from_model(cls, stop: "HuntStop") -> "HuntStopOut":
        return cls(
            id=stop.id,
            slug=stop.slug,
            poi_slug=stop.poi_slug,
            title=loc(stop, "title"),
            hint=loc(stop, "hint"),
            order=stop.sort_order,
        )


class BadgeOut(BaseModel):
    id: int
    slug: str
    name: Localized
    icon: str | None
    threshold: int

    @classmethod
    def from_model(cls, badge: "Badge") -> "BadgeOut":
        return cls(
            id=badge.id,
            slug=badge.slug,
            name=loc(badge, "name"),
            icon=badge.icon,
            threshold=badge.threshold,
        )


class CheckinIn(BaseModel):
    device_id: str = Field(min_length=8, max_length=64)
    code: str = Field(min_length=1, max_length=60)
