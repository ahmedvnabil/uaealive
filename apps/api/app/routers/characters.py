"""Public character endpoints — persona prompts and fallback answers never leave the server."""

from fastapi import APIRouter
from sqlalchemy import select

from app.db import DbSession
from app.models import Character
from app.schemas.character import CharacterOut
from app.schemas.common import envelope

router = APIRouter(prefix="/api/v1", tags=["characters"])


@router.get("/characters")
def list_characters(db: DbSession) -> dict:
    characters = db.scalars(select(Character).order_by(Character.id)).all()
    return envelope([CharacterOut.from_model(character) for character in characters])
