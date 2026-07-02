"""Request models and SSE wire helpers for the chat and copilot endpoints."""

import json
from typing import Annotated, Literal

from pydantic import BaseModel, Field

MAX_MESSAGES = 20
MAX_MESSAGE_CHARS = 2000
MAX_INTERESTS = 12


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=MAX_MESSAGES)
    locale: Literal["ar", "en"] = "ar"


class TourRequest(BaseModel):
    interests: list[Annotated[str, Field(max_length=80)]] = Field(
        default_factory=list, max_length=MAX_INTERESTS
    )
    duration_min: int = Field(default=60, ge=15, le=480)
    audience: str = Field(default="tourist", max_length=40)
    locale: Literal["ar", "en"] = "ar"


def sse_event(payload: dict) -> str:
    """Frame one payload per the SSE wire contract: ``data: {...}\\n\\n``."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
