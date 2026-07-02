"""Tests for POI endpoints and the API health check."""

# Al Fahidi district plus immediately adjacent landmarks (e.g. Sheikh Saeed House).
LAT_BOUNDS = (25.255, 25.275)
LNG_BOUNDS = (55.285, 55.310)


def test_health(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json() == {"ok": True, "data": {"status": "ok"}, "error": None}


def test_list_pois_shape(seeded_client):
    res = seeded_client.get("/api/v1/pois")
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True and body["error"] is None
    pois = body["data"]
    assert len(pois) >= 15
    for poi in pois:
        assert set(poi["name"]) == {"ar", "en"}
        assert poi["name"]["ar"] and poi["name"]["en"]
        assert set(poi["summary"]) == {"ar", "en"}
        assert isinstance(poi["lat"], float) and isinstance(poi["lng"], float)
        assert LAT_BOUNDS[0] <= poi["lat"] <= LAT_BOUNDS[1]
        assert LNG_BOUNDS[0] <= poi["lng"] <= LNG_BOUNDS[1]
        assert set(poi["accessibility"]) == {"wheelchair", "audio"}
        assert {"id", "slug", "kind", "era_built", "hero_image", "order"} <= set(poi)


def test_list_pois_kind_filter(seeded_client):
    res = seeded_client.get("/api/v1/pois", params={"kind": "museum"})
    pois = res.json()["data"]
    assert pois
    assert all(poi["kind"] == "museum" for poi in pois)


def test_poi_detail_includes_stories(seeded_client):
    res = seeded_client.get("/api/v1/pois/coffee-museum")
    assert res.status_code == 200
    poi = res.json()["data"]
    assert poi["slug"] == "coffee-museum"
    assert len(poi["stories"]) >= 1
    for story in poi["stories"]:
        assert story["poi_slug"] == "coffee-museum"
        assert set(story["title"]) == {"ar", "en"}
        assert isinstance(story["sources"], list)


def test_poi_unknown_slug_returns_404_envelope(client):
    res = client.get("/api/v1/pois/not-a-real-place")
    assert res.status_code == 404
    assert res.json() == {"ok": False, "data": None, "error": "not_found"}
