"""Event DTOs."""

import datetime
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import Bilingual, Localized, loc

if TYPE_CHECKING:
    from app.models.event import Event


class EventOut(BaseModel):
    id: int
    slug: str
    kind: str
    title: Localized
    description: Localized
    starts_on: datetime.date
    ends_on: datetime.date
    location: Localized

    @classmethod
    def from_model(cls, event: "Event") -> "EventOut":
        return cls(
            id=event.id,
            slug=event.slug,
            kind=event.kind,
            title=loc(event, "title"),
            description=loc(event, "description"),
            starts_on=event.starts_on,
            ends_on=event.ends_on,
            location=loc(event, "location"),
        )


class EventIn(BaseModel):
    """Admin write payload for a cultural event."""

    slug: str = Field(min_length=1, max_length=120)
    kind: str = Field(min_length=1, max_length=60)
    title: Bilingual
    description: Bilingual
    starts_on: datetime.date
    ends_on: datetime.date
    location: Bilingual

    @model_validator(mode="after")
    def _dates_ordered(self) -> "EventIn":
        if self.ends_on < self.starts_on:
            raise ValueError("ends_on must not precede starts_on")
        return self

    def to_values(self) -> dict[str, Any]:
        return {
            "slug": self.slug,
            "kind": self.kind,
            "title_ar": self.title.ar,
            "title_en": self.title.en,
            "description_ar": self.description.ar,
            "description_en": self.description.en,
            "starts_on": self.starts_on,
            "ends_on": self.ends_on,
            "location_ar": self.location.ar,
            "location_en": self.location.en,
        }
