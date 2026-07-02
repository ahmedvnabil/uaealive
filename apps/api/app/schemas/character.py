"""Character DTOs — public shape NEVER includes persona_prompt or fallback_qa."""

from typing import TYPE_CHECKING

from pydantic import BaseModel

from app.schemas.common import Localized, loc

if TYPE_CHECKING:
    from app.models.character import Character


class CharacterOut(BaseModel):
    slug: str
    name: Localized
    role: Localized
    greeting: Localized
    avatar: str | None

    @classmethod
    def from_model(cls, character: "Character") -> "CharacterOut":
        return cls(
            slug=character.slug,
            name=loc(character, "name"),
            role=loc(character, "role"),
            greeting=loc(character, "greeting"),
            avatar=character.avatar,
        )
