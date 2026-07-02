"""Shared response envelope and localization helpers per Interface Contracts."""

from typing import Any

from pydantic import BaseModel, Field

Localized = dict[str, str]


class Bilingual(BaseModel):
    """Strict `{ar, en}` input pair for admin write payloads."""

    ar: str = Field(min_length=1)
    en: str = Field(min_length=1)


def envelope(data: Any = None, error: str | None = None) -> dict:
    return {"ok": error is None, "data": data, "error": error}


def loc(row: Any, field: str) -> Localized:
    """Build a bilingual {"ar", "en"} dict from a row's `<field>_ar`/`<field>_en` columns."""
    return {"ar": getattr(row, f"{field}_ar"), "en": getattr(row, f"{field}_en")}
