"""Tests for the treasure hunt: stop listing, check-in idempotency, badge thresholds."""

import json
import uuid
from pathlib import Path

from app.config import get_settings

STOPS_URL = "/api/v1/hunt/stops"
CHECKIN_URL = "/api/v1/hunt/checkin"
PROGRESS_URL = "/api/v1/hunt/progress"


def _hunt_data() -> dict:
    path = Path(get_settings().data_dir) / "hunt.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _stops() -> list[dict]:
    return sorted(_hunt_data()["stops"], key=lambda stop: stop["order"])


def _badges() -> list[dict]:
    return sorted(_hunt_data()["badges"], key=lambda badge: badge["threshold"])


def _device() -> str:
    return uuid.uuid4().hex


def _checkin(client, device_id: str, code: str) -> dict:
    res = client.post(CHECKIN_URL, json={"device_id": device_id, "code": code})
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    return body["data"]


def test_hunt_stops_listed_without_secret_codes(seeded_client):
    res = seeded_client.get(STOPS_URL)
    assert res.status_code == 200
    stops = res.json()["data"]
    assert len(stops) == len(_stops())
    orders = [stop["order"] for stop in stops]
    assert orders == sorted(orders)
    for stop in stops:
        assert {"id", "slug", "poi_slug", "title", "hint", "order"} <= set(stop)
        assert "code" not in stop
        assert set(stop["title"]) == {"ar", "en"}
        assert set(stop["hint"]) == {"ar", "en"}


def test_checkin_wrong_code_is_not_correct(seeded_client):
    data = _checkin(seeded_client, _device(), "WRONG-CODE-999")
    assert data["correct"] is False
    assert "stop" not in data
    assert "badge" not in data
    assert data["progress"] == {"found": 0, "total": len(_stops())}


def test_checkin_correct_code_twice_is_idempotent(seeded_client):
    first_stop = _stops()[0]
    device = _device()

    data = _checkin(seeded_client, device, first_stop["code"])
    assert data["correct"] is True
    assert data["stop"]["slug"] == first_stop["slug"]
    assert "code" not in data["stop"]
    assert data["progress"] == {"found": 1, "total": len(_stops())}

    repeat = _checkin(seeded_client, device, first_stop["code"])
    assert repeat["correct"] is True
    assert repeat["progress"] == {"found": 1, "total": len(_stops())}
    # A badge is only awarded the moment its threshold is newly crossed.
    assert "badge" not in repeat


def test_checkin_code_is_case_and_whitespace_insensitive(seeded_client):
    first_stop = _stops()[0]
    data = _checkin(seeded_client, _device(), f"  {first_stop['code'].lower()}  ")
    assert data["correct"] is True
    assert data["stop"]["slug"] == first_stop["slug"]


def test_badges_awarded_exactly_at_thresholds(seeded_client):
    stops = _stops()
    badges = _badges()
    target = badges[1]["threshold"]  # cross the first two thresholds (1 and 3 in seed data)
    assert target <= len(stops)
    device = _device()

    awarded: list[str] = []
    for index, stop in enumerate(stops[:target], start=1):
        data = _checkin(seeded_client, device, stop["code"])
        assert data["correct"] is True
        assert data["progress"]["found"] == index
        if "badge" in data:
            awarded.append(data["badge"]["slug"])

    expected = [badge["slug"] for badge in badges if badge["threshold"] <= target]
    assert awarded == expected

    res = seeded_client.get(PROGRESS_URL, params={"device_id": device})
    progress = res.json()["data"]
    assert progress["found"] == [stop["slug"] for stop in stops[:target]]
    assert [badge["slug"] for badge in progress["badges"]] == expected
    for badge in progress["badges"]:
        assert {"slug", "name", "icon", "threshold"} <= set(badge)
        assert set(badge["name"]) == {"ar", "en"}


def test_progress_for_fresh_device_is_empty(seeded_client):
    res = seeded_client.get(PROGRESS_URL, params={"device_id": _device()})
    assert res.status_code == 200
    assert res.json()["data"] == {"found": [], "badges": []}


def test_checkin_rejects_short_device_id(seeded_client):
    res = seeded_client.post(CHECKIN_URL, json={"device_id": "abc", "code": "DALLAH"})
    assert res.status_code == 422
    assert res.json() == {"ok": False, "data": None, "error": "validation_error"}
