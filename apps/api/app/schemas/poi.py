"""POI DTOs."""

from typing import TYPE_CHECKING, Any

from geoalchemy2.elements import WKTElement
from pydantic import BaseModel, Field

from app.schemas.common import Bilingual, Localized, loc
from app.schemas.story import StoryOut

if TYPE_CHECKING:
    from app.models.poi import Poi


class AccessibilityOut(BaseModel):
    wheelchair: bool
    audio: bool


class PoiOut(BaseModel):
    id: int
    slug: str
    kind: str
    name: Localized
    summary: Localized
    lat: float
    lng: float
    era_built: str | None
    accessibility: AccessibilityOut
    hero_image: str | None
    order: int

    @classmethod
    def from_model(cls, poi: "Poi") -> "PoiOut":
        return cls(**cls._base_fields(poi))

    @staticmethod
    def _base_fields(poi: "Poi") -> dict:
        return {
            "id": poi.id,
            "slug": poi.slug,
            "kind": poi.kind,
            "name": loc(poi, "name"),
            "summary": loc(poi, "summary"),
            "lat": poi.lat,
            "lng": poi.lng,
            "era_built": poi.era_built,
            "accessibility": AccessibilityOut(wheelchair=poi.wheelchair, audio=poi.audio),
            "hero_image": poi.hero_image,
            "order": poi.sort_order,
        }


class PoiDetailOut(PoiOut):
    stories: list[StoryOut]

    @classmethod
    def from_model(cls, poi: "Poi") -> "PoiDetailOut":
        return cls(
            **cls._base_fields(poi),
            stories=[StoryOut.from_model(story) for story in poi.stories],
        )


class PoiIn(BaseModel):
    """Admin write payload for a POI."""

    slug: str = Field(min_length=1, max_length=120)
    kind: str = Field(min_length=1, max_length=60)
    name: Bilingual
    summary: Bilingual
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    era_built: str | None = Field(default=None, max_length=120)
    accessibility: AccessibilityOut
    hero_image: str | None = Field(default=None, max_length=500)
    order: int = 0

    def to_values(self) -> dict[str, Any]:
        """Map the payload onto Poi ORM columns (keeps geom in sync with lat/lng)."""
        return {
            "slug": self.slug,
            "kind": self.kind,
            "name_ar": self.name.ar,
            "name_en": self.name.en,
            "summary_ar": self.summary.ar,
            "summary_en": self.summary.en,
            "lat": self.lat,
            "lng": self.lng,
            "geom": WKTElement(f"POINT({self.lng} {self.lat})", srid=4326),
            "era_built": self.era_built,
            "wheelchair": self.accessibility.wheelchair,
            "audio": self.accessibility.audio,
            "hero_image": self.hero_image,
            "sort_order": self.order,
        }
