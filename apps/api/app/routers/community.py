"""Community contribution endpoint — everything lands in a moderated pending queue."""

from fastapi import APIRouter, Request

from app.db import DbSession
from app.limits import limiter
from app.models import Submission
from app.schemas.common import envelope
from app.schemas.submission import SubmissionIn
from app.security import sanitize_json, strip_html

router = APIRouter(prefix="/api/v1/community", tags=["community"])

SUBMISSION_RATE_LIMIT = "5/minute"


@router.post("/submissions")
@limiter.limit(SUBMISSION_RATE_LIMIT)
def create_submission(request: Request, payload: SubmissionIn, db: DbSession) -> dict:
    """Store a sanitized community submission with status `pending`."""
    submission = Submission(
        type=payload.type,
        payload=sanitize_json(payload.payload),
        contact=strip_html(payload.contact) if payload.contact else None,
        status="pending",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return envelope({"id": submission.id, "status": submission.status})
