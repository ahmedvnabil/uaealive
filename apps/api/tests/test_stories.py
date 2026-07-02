"""Tests for the remaining public read endpoints: stories, timeline, characters, events, geo."""

import datetime

from app.models import Event


def test_list_stories_shape(seeded_client):
    res = seeded_client.get("/api/v1/stories")
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    stories = body["data"]
    assert len(stories) >= 36
    for story in stories:
        assert {"id", "poi_slug", "audience", "title", "body", "sources"} <= set(story)
        assert story["audience"] in {"tourist", "kids", "expert"}
        assert set(story["title"]) == {"ar", "en"}
        assert set(story["body"]) == {"ar", "en"}
        assert isinstance(story["sources"], list)
        assert all(isinstance(src, str) for src in story["sources"])


def test_list_stories_filters(seeded_client):
    res = seeded_client.get(
        "/api/v1/stories", params={"poi": "coffee-museum", "audience": "kids"}
    )
    stories = res.json()["data"]
    assert stories
    assert all(s["poi_slug"] == "coffee-museum" and s["audience"] == "kids" for s in stories)


def test_timeline_periods(seeded_client):
    res = seeded_client.get("/api/v1/timeline")
    periods = res.json()["data"]
    assert [p["key"] for p in periods] == ["1950", "1970", "1990", "today"]
    for period in periods:
        assert set(period["name"]) == {"ar", "en"}
        assert set(period["description"]) == {"ar", "en"}
        assert {"sky", "ambient", "accent"} <= set(period["palette"])


def test_characters_do_not_leak_persona(seeded_client):
    res = seeded_client.get("/api/v1/characters")
    characters = res.json()["data"]
    assert len(characters) >= 5
    for character in characters:
        assert "persona_prompt" not in character
        assert "fallback_qa" not in character
        assert {"slug", "name", "role", "greeting", "avatar"} <= set(character)
        assert set(character["greeting"]) == {"ar", "en"}


def test_events_upcoming_filter(seeded_client, db_session):
    past = Event(
        slug="test-past-event",
        kind="exhibition",
        title_ar="حدث منتهٍ",
        title_en="Finished event",
        description_ar="وصف",
        description_en="Description",
        starts_on=datetime.date(2020, 1, 1),
        ends_on=datetime.date(2020, 1, 5),
        location_ar="الفهيدي",
        location_en="Al Fahidi",
    )
    db_session.add(past)
    db_session.flush()

    all_events = seeded_client.get("/api/v1/events").json()["data"]
    assert any(e["slug"] == "test-past-event" for e in all_events)
    assert len(all_events) >= 7

    upcoming = seeded_client.get("/api/v1/events", params={"upcoming": "true"}).json()["data"]
    assert upcoming
    assert not any(e["slug"] == "test-past-event" for e in upcoming)
    today = datetime.date.today().isoformat()
    assert all(e["ends_on"] >= today for e in upcoming)
    for event in upcoming:
        assert {"id", "slug", "kind", "starts_on", "ends_on"} <= set(event)
        assert set(event["title"]) == {"ar", "en"}
        assert set(event["location"]) == {"ar", "en"}


def test_geo_district_returns_raw_geojson(client):
    res = client.get("/api/v1/geo/district")
    assert res.status_code == 200
    fc = res.json()
    # Raw FeatureCollection — explicitly NOT wrapped in the envelope.
    assert "ok" not in fc
    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) >= 120
    assert all(f["type"] == "Feature" for f in fc["features"])
