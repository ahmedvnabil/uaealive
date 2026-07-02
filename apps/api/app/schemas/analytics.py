"""Analytics DTOs."""

import json
from typing import Any

from pydantic import BaseModel, Field, field_validator

MAX_META_BYTES = 4 * 1024


class TrackIn(BaseModel):
    event: str = Field(min_length=1, max_length=60)
    device_id: str | None = Field(default=None, max_length=64)
    meta: dict[str, Any] = Field(default_factory=dict)

    @field_validator("meta")
    @classmethod
    def _meta_within_limit(cls, value: dict[str, Any]) -> dict[str, Any]:
        size = len(json.dumps(value, ensure_ascii=False).encode("utf-8"))
        if size > MAX_META_BYTES:
            raise ValueError(f"meta exceeds {MAX_META_BYTES} bytes")
        return value
