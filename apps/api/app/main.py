"""FastAPI application factory for the UAE ALIVE API."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.limits import limiter
from app.routers import (
    admin,
    analytics,
    characters,
    chat,
    community,
    copilot,
    events,
    geo,
    hunt,
    pois,
    stories,
    timeline,
)
from app.schemas.common import envelope

ROUTERS = (
    pois.router,
    stories.router,
    timeline.router,
    characters.router,
    events.router,
    geo.router,
    chat.router,
    copilot.router,
    community.router,
    hunt.router,
    analytics.router,
    admin.router,
)


async def _http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=envelope(error=str(exc.detail)),
        headers=exc.headers,
    )


async def _validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content=envelope(error="validation_error"))


async def _rate_limit_handler(_: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Keep the `{ok,data,error}` envelope on 429s (slowapi's default breaks it)."""
    return JSONResponse(status_code=429, content=envelope(error="rate_limited"))


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="UAE ALIVE API",
        version="1.0.0",
        docs_url="/api/v1/docs",
        openapi_url="/api/v1/openapi.json",
    )

    application.state.limiter = limiter
    application.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
    application.add_exception_handler(StarletteHTTPException, _http_exception_handler)
    application.add_exception_handler(RequestValidationError, _validation_exception_handler)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/api/v1/health")
    def health() -> dict:
        return envelope({"status": "ok"})

    for router in ROUTERS:
        application.include_router(router)

    return application


app = create_app()
