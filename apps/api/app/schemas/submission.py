"""Community submission DTOs."""

import datetime
import json
from typing import TYPE_CHECKING, Any, Literal

from pydantic import BaseModel, Field, field_validator

if TYPE_CHECKING:
    from app.models.submission import Submission

MAX_PAYLOAD_BYTES = 10 * 1024


class SubmissionIn(BaseModel):
    type: Literal["story", "photo", "memory", "document"]
    payload: dict[str, Any]
    contact: str | None = Field(default=None, max_length=255)

    @field_validator("payload")
    @classmethod
    def _payload_within_limit(cls, value: dict[str, Any]) -> dict[str, Any]:
        size = len(json.dumps(value, ensure_ascii=False).encode("utf-8"))
        if size > MAX_PAYLOAD_BYTES:
            raise ValueError(f"payload exceeds {MAX_PAYLOAD_BYTES} bytes")
        return value


class SubmissionAdminOut(BaseModel):
    id: int
    type: str
    payload: dict[str, Any]
    contact: str | None
    status: str
    created_at: datetime.datetime

    @classmethod
    def from_model(cls, submission: "Submission") -> "SubmissionAdminOut":
        return cls(
            id=submission.id,
            type=submission.type,
            payload=dict(submission.payload or {}),
            contact=submission.contact,
            status=submission.status,
            created_at=submission.created_at,
        )
