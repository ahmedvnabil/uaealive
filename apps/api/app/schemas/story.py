"""Story DTOs."""

from typing import TYPE_CHECKING, Any, Literal

from pydantic import BaseModel, Field

from app.schemas.common import Bilingual, Localized, loc

if TYPE_CHECKING:
    from app.models.story import Story


class StoryOut(BaseModel):
    id: int
    poi_slug: str
    audience: str
    title: Localized
    body: Localized
    sources: list[str]

    @classmethod
    def from_model(cls, story: "Story") -> "StoryOut":
        return cls(
            id=story.id,
            poi_slug=story.poi.slug,
            audience=story.audience,
            title=loc(story, "title"),
            body=loc(story, "body"),
            sources=list(story.sources or []),
        )


class StoryIn(BaseModel):
    """Admin write payload for a story (joined to its POI by slug)."""

    poi_slug: str = Field(min_length=1, max_length=120)
    audience: Literal["tourist", "kids", "expert"]
    title: Bilingual
    body: Bilingual
    sources: list[str] = Field(default_factory=list)

    def to_values(self, poi_id: int) -> dict[str, Any]:
        return {
            "poi_id": poi_id,
            "audience": self.audience,
            "title_ar": self.title.ar,
            "title_en": self.title.en,
            "body_ar": self.body.ar,
            "body_en": self.body.en,
            "sources": list(self.sources),
        }
