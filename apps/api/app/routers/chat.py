"""Streaming character chat endpoint (SSE) with offline canned fallback."""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.config import get_settings
from app.db import DbSession
from app.limits import limiter
from app.models import Character
from app.schemas.chat import ChatRequest
from app.services import ai
from app.services.fallback import best_fallback

router = APIRouter(prefix="/api/v1", tags=["chat"])

CHAT_RATE_LIMIT = "20/minute"

_LOCALE_LINE = {
    "ar": (
        "The visitor is using the Arabic interface: default to clear Modern Standard "
        "Arabic unless their last message is in English."
    ),
    "en": (
        "The visitor is using the English interface: default to English unless their "
        "last message is in Arabic."
    ),
}
_SAFETY_LINE = (
    "Stay strictly in character, keep every reply family-friendly and under about 150 "
    "words, and politely decline modern politics or anything outside your era."
)


def _system_prompt(persona_prompt: str, locale: str) -> str:
    return f"{persona_prompt}\n\n{_LOCALE_LINE.get(locale, _LOCALE_LINE['en'])}\n{_SAFETY_LINE}"


def _last_user_text(payload: ChatRequest) -> str:
    for message in reversed(payload.messages):
        if message.role == "user":
            return message.content
    return payload.messages[-1].content


@router.post("/chat/{character_slug}")
@limiter.limit(CHAT_RATE_LIMIT)
async def chat_with_character(
    request: Request, character_slug: str, payload: ChatRequest, db: DbSession
) -> StreamingResponse:
    """Stream an in-character answer; degrade to a curated canned answer offline."""
    character = db.scalar(select(Character).where(Character.slug == character_slug))
    if character is None:
        raise HTTPException(status_code=404, detail="not_found")

    settings = get_settings()
    system = _system_prompt(character.persona_prompt, payload.locale)
    messages = [message.model_dump() for message in payload.messages]
    user_text = _last_user_text(payload)
    locale = payload.locale

    stream = ai.sse_with_fallback(
        lambda: ai.stream_completion(settings.ai_model_chat, system, messages),
        lambda: best_fallback(character, user_text, locale),
    )
    return StreamingResponse(stream, media_type="text/event-stream")
