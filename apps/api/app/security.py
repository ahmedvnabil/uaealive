"""Admin bearer authentication and server-side input sanitization."""

import re
import secrets
from typing import Annotated, Any

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings

_bearer_scheme = HTTPBearer(auto_error=False)
_TAG_RE = re.compile(r"<[^>]*>")


def require_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
) -> None:
    """Reject the request with a 401 envelope unless the Bearer token matches ADMIN_PASSWORD."""
    supplied = credentials.credentials if credentials else ""
    expected = get_settings().admin_password
    if not expected or not secrets.compare_digest(supplied.encode(), expected.encode()):
        raise HTTPException(
            status_code=401,
            detail="unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )


def strip_html(text: str) -> str:
    """Remove HTML tags, re-scanning until stable so split tags can't survive removal."""
    previous = None
    while previous != text:
        previous = text
        text = _TAG_RE.sub("", text)
    return text.strip()


def sanitize_json(value: Any) -> Any:
    """Recursively strip HTML from every string inside a JSON-like structure."""
    if isinstance(value, str):
        return strip_html(value)
    if isinstance(value, list):
        return [sanitize_json(item) for item in value]
    if isinstance(value, dict):
        return {key: sanitize_json(item) for key, item in value.items()}
    return value
