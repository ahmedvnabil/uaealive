"""Streaming tour copilot endpoint (SSE) with a deterministic template fallback."""

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.limits import limiter
from app.schemas.chat import TourRequest
from app.services import ai
from app.services.tours import build_fallback_tour, build_live_tour_prompt

router = APIRouter(prefix="/api/v1", tags=["copilot"])

COPILOT_RATE_LIMIT = "20/minute"
COPILOT_MAX_TOKENS = 900


@router.post("/copilot/tour")
@limiter.limit(COPILOT_RATE_LIMIT)
async def copilot_tour(request: Request, payload: TourRequest) -> StreamingResponse:
    """Stream a personalised walking tour; degrade to a template tour offline."""
    settings = get_settings()
    system, user = build_live_tour_prompt(
        payload.interests, payload.duration_min, payload.audience, payload.locale
    )
    stream = ai.sse_with_fallback(
        lambda: ai.stream_completion(
            settings.ai_model_copilot,
            system,
            [{"role": "user", "content": user}],
            max_tokens=COPILOT_MAX_TOKENS,
        ),
        lambda: build_fallback_tour(
            payload.interests, payload.duration_min, payload.audience, payload.locale
        ),
    )
    return StreamingResponse(stream, media_type="text/event-stream")
