"""Tests for the idempotent database seed."""

from pathlib import Path

from app.config import get_settings
from app.seed import seed_all


def test_seed_twice_yields_identical_counts(db_session):
    data_dir = Path(get_settings().data_dir)

    first = seed_all(db_session, data_dir)
    second = seed_all(db_session, data_dir)

    assert first == second
    assert first["pois"] >= 15
    assert first["stories"] >= 36
    assert first["characters"] >= 5
    assert first["timeline_periods"] == 4
    assert first["events"] >= 6
    assert first["hunt_stops"] >= 6
    assert first["badges"] >= 4
