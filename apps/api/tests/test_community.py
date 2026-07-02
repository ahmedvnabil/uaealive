"""Tests for community submissions: validation, HTML sanitization, pending status."""

import pytest

from app.limits import limiter
from app.models import Submission

SUBMISSIONS_URL = "/api/v1/community/submissions"


@pytest.fixture(autouse=True)
def _no_rate_limit(monkeypatch):
    """Keep this module deterministic regardless of how many POSTs the suite makes."""
    monkeypatch.setattr(limiter, "enabled", False)


def test_submission_created_with_pending_status(client, db_session):
    res = client.post(
        SUBMISSIONS_URL,
        json={
            "type": "memory",
            "payload": {"title": "ذكرى الفريج", "body": "كنا نلعب في السكيك قبل المغرب."},
            "contact": "user@example.com",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    data = body["data"]
    assert set(data) == {"id", "status"}
    assert data["status"] == "pending"

    stored = db_session.get(Submission, data["id"])
    assert stored is not None
    assert stored.status == "pending"
    assert stored.type == "memory"
    assert stored.contact == "user@example.com"


def test_submission_strips_html_server_side(client, db_session):
    res = client.post(
        SUBMISSIONS_URL,
        json={
            "type": "story",
            "payload": {
                "title": "<b>عنوان</b>",
                "body": "قبل<img src=x onerror=alert(1)>بعد",
                "tags": ["<i>تراث</i>", "الفهيدي"],
                "year": 1965,
            },
            "contact": "<a href='https://x.test'>a@b.com</a>",
        },
    )
    assert res.status_code == 200
    stored = db_session.get(Submission, res.json()["data"]["id"])
    assert stored.payload["title"] == "عنوان"
    assert stored.payload["body"] == "قبلبعد"
    assert stored.payload["tags"] == ["تراث", "الفهيدي"]
    assert stored.payload["year"] == 1965
    assert stored.contact == "a@b.com"


def test_submission_rejects_unknown_type(client):
    res = client.post(SUBMISSIONS_URL, json={"type": "spam", "payload": {"body": "x"}})
    assert res.status_code == 422
    assert res.json() == {"ok": False, "data": None, "error": "validation_error"}


def test_submission_rejects_oversized_payload(client):
    res = client.post(
        SUBMISSIONS_URL,
        json={"type": "document", "payload": {"body": "x" * (10 * 1024 + 1)}},
    )
    assert res.status_code == 422
    assert res.json()["ok"] is False
