"""Tests for admin auth, content CRUD, submission moderation and analytics summary."""

import pytest

from app.config import get_settings
from app.models import Submission

TEST_ADMIN_PASSWORD = "test-admin-secret"
HEADERS = {"Authorization": f"Bearer {TEST_ADMIN_PASSWORD}"}
TRACK_URL = "/api/v1/analytics/track"


@pytest.fixture(autouse=True)
def _admin_password(monkeypatch):
    """Pin a known admin password so tests never touch the real .env secret."""
    monkeypatch.setattr(get_settings(), "admin_password", TEST_ADMIN_PASSWORD)


def _poi_body(slug: str = "test-admin-house") -> dict:
    return {
        "slug": slug,
        "kind": "house",
        "name": {"ar": "بيت الاختبار", "en": "Test House"},
        "summary": {"ar": "ملخص تجريبي", "en": "A test summary"},
        "lat": 25.264,
        "lng": 55.3,
        "era_built": "1920s",
        "accessibility": {"wheelchair": True, "audio": False},
        "hero_image": None,
        "order": 99,
    }


def _event_body(slug: str = "test-admin-event") -> dict:
    return {
        "slug": slug,
        "kind": "exhibition",
        "title": {"ar": "معرض تجريبي", "en": "Test Exhibition"},
        "description": {"ar": "وصف", "en": "Description"},
        "starts_on": "2030-01-10",
        "ends_on": "2030-01-20",
        "location": {"ar": "الفهيدي", "en": "Al Fahidi"},
    }


# --- auth ------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "url"),
    [
        ("GET", "/api/v1/admin/submissions"),
        ("GET", "/api/v1/admin/analytics/summary"),
        ("POST", "/api/v1/admin/pois"),
    ],
)
def test_admin_requires_bearer_token(client, method, url):
    kwargs = {"json": _poi_body()} if method == "POST" else {}

    missing = client.request(method, url, **kwargs)
    assert missing.status_code == 401
    assert missing.json() == {"ok": False, "data": None, "error": "unauthorized"}

    wrong = client.request(
        method, url, headers={"Authorization": "Bearer wrong-token"}, **kwargs
    )
    assert wrong.status_code == 401
    assert wrong.json()["ok"] is False


# --- moderation ------------------------------------------------------------------


def _make_submission(db_session, **overrides) -> Submission:
    values = {
        "type": "memory",
        "payload": {"title": "ذكرى", "body": "نص الذكرى"},
        "contact": None,
        "status": "pending",
    }
    values.update(overrides)
    submission = Submission(**values)
    db_session.add(submission)
    db_session.flush()
    return submission


def test_moderation_approve_and_reject_flip_status(client, db_session):
    approved = _make_submission(db_session)
    rejected = _make_submission(db_session, type="photo")

    pending = client.get(
        "/api/v1/admin/submissions", params={"status": "pending"}, headers=HEADERS
    ).json()["data"]
    pending_ids = {item["id"] for item in pending}
    assert {approved.id, rejected.id} <= pending_ids
    for item in pending:
        assert {"id", "type", "payload", "contact", "status", "created_at"} <= set(item)

    res = client.post(f"/api/v1/admin/submissions/{approved.id}/approve", headers=HEADERS)
    assert res.status_code == 200
    assert res.json()["data"] == {"id": approved.id, "status": "approved"}

    res = client.post(f"/api/v1/admin/submissions/{rejected.id}/reject", headers=HEADERS)
    assert res.json()["data"] == {"id": rejected.id, "status": "rejected"}

    remaining = client.get(
        "/api/v1/admin/submissions", params={"status": "pending"}, headers=HEADERS
    ).json()["data"]
    remaining_ids = {item["id"] for item in remaining}
    assert approved.id not in remaining_ids
    assert rejected.id not in remaining_ids


def test_moderation_unknown_submission_404(client):
    res = client.post("/api/v1/admin/submissions/999999/approve", headers=HEADERS)
    assert res.status_code == 404
    assert res.json() == {"ok": False, "data": None, "error": "not_found"}


# --- content CRUD ------------------------------------------------------------------


def test_admin_poi_crud_roundtrip(seeded_client):
    created = seeded_client.post("/api/v1/admin/pois", json=_poi_body(), headers=HEADERS)
    assert created.status_code == 200
    poi = created.json()["data"]
    assert poi["slug"] == "test-admin-house"
    assert poi["name"] == {"ar": "بيت الاختبار", "en": "Test House"}

    public = seeded_client.get("/api/v1/pois/test-admin-house").json()["data"]
    assert public["accessibility"] == {"wheelchair": True, "audio": False}

    updated_body = _poi_body()
    updated_body["name"]["en"] = "Renamed House"
    res = seeded_client.put(
        f"/api/v1/admin/pois/{poi['id']}", json=updated_body, headers=HEADERS
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"]["en"] == "Renamed House"

    res = seeded_client.delete(f"/api/v1/admin/pois/{poi['id']}", headers=HEADERS)
    assert res.json()["data"] == {"deleted": True}
    assert seeded_client.get("/api/v1/pois/test-admin-house").status_code == 404


def test_admin_poi_duplicate_slug_conflict(seeded_client):
    res = seeded_client.post(
        "/api/v1/admin/pois", json=_poi_body(slug="coffee-museum"), headers=HEADERS
    )
    assert res.status_code == 409
    assert res.json() == {"ok": False, "data": None, "error": "conflict"}


def test_admin_story_create_and_delete(seeded_client):
    body = {
        "poi_slug": "coffee-museum",
        "audience": "tourist",
        "title": {"ar": "قصة تجريبية", "en": "A Test Story"},
        "body": {"ar": "نص القصة", "en": "Story body"},
        "sources": ["https://example.org/source"],
    }
    created = seeded_client.post("/api/v1/admin/stories", json=body, headers=HEADERS)
    assert created.status_code == 200
    story = created.json()["data"]
    assert story["poi_slug"] == "coffee-museum"

    listed = seeded_client.get(
        "/api/v1/stories", params={"poi": "coffee-museum", "audience": "tourist"}
    ).json()["data"]
    assert any(item["id"] == story["id"] for item in listed)

    res = seeded_client.delete(f"/api/v1/admin/stories/{story['id']}", headers=HEADERS)
    assert res.json()["data"] == {"deleted": True}


def test_admin_story_unknown_poi_404(seeded_client):
    body = {
        "poi_slug": "no-such-poi",
        "audience": "kids",
        "title": {"ar": "ق", "en": "S"},
        "body": {"ar": "ن", "en": "B"},
        "sources": [],
    }
    res = seeded_client.post("/api/v1/admin/stories", json=body, headers=HEADERS)
    assert res.status_code == 404
    assert res.json()["error"] == "not_found"


def test_admin_event_crud_roundtrip(seeded_client):
    created = seeded_client.post("/api/v1/admin/events", json=_event_body(), headers=HEADERS)
    assert created.status_code == 200
    event = created.json()["data"]

    upcoming = seeded_client.get("/api/v1/events", params={"upcoming": "true"}).json()["data"]
    assert any(item["slug"] == "test-admin-event" for item in upcoming)

    body = _event_body()
    body["title"]["en"] = "Renamed Exhibition"
    res = seeded_client.put(
        f"/api/v1/admin/events/{event['id']}", json=body, headers=HEADERS
    )
    assert res.json()["data"]["title"]["en"] == "Renamed Exhibition"

    res = seeded_client.delete(f"/api/v1/admin/events/{event['id']}", headers=HEADERS)
    assert res.json()["data"] == {"deleted": True}


# --- analytics ---------------------------------------------------------------------


def test_track_inserts_and_summary_aggregates(client):
    events = [
        ("page_view", {"page": "map", "lang": "ar"}),
        ("page_view", {"page": "map", "lang": "en"}),
        ("page_view", {"page": "stories", "lang": "ar"}),
        ("poi_view", {"poi": "coffee-museum", "page": "map", "lang": "ar"}),
        ("poi_view", {"poi": "coffee-museum"}),
        ("poi_view", {"poi": "xva-gallery"}),
        ("chat_message", {"character": "pearl-diver", "lang": "ar"}),
    ]
    for event, meta in events:
        res = client.post(TRACK_URL, json={"device_id": "d" * 32, "event": event, "meta": meta})
        assert res.status_code == 200
        assert res.json()["data"] == {"tracked": True}

    summary = client.get("/api/v1/admin/analytics/summary", headers=HEADERS).json()["data"]
    assert summary["total_events"] == len(events)
    assert summary["chat_messages"] == 1
    assert summary["by_page"][0] == {"page": "map", "count": 3}
    assert {"page": "stories", "count": 1} in summary["by_page"]
    assert summary["top_pois"] == [
        {"poi": "coffee-museum", "count": 2},
        {"poi": "xva-gallery", "count": 1},
    ]
    assert summary["by_lang"][0] == {"lang": "ar", "count": 4}
    assert {"lang": "en", "count": 1} in summary["by_lang"]


def test_track_rejects_empty_event(client):
    res = client.post(TRACK_URL, json={"event": "", "meta": {}})
    assert res.status_code == 422
    assert res.json() == {"ok": False, "data": None, "error": "validation_error"}
