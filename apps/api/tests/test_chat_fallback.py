"""Offline tests for the AI layer: character chat + tour copilot SSE with fallback."""

import json
import re
from pathlib import Path
from types import SimpleNamespace

from sqlalchemy import select

from app.config import get_settings
from app.models import Character
from app.services import ai
from app.services.fallback import GENERIC_APOLOGY, best_fallback
from app.services.tours import build_fallback_tour

CHAT_URL = "/api/v1/chat/pearl-diver"
TOUR_URL = "/api/v1/copilot/tour"
STOP_LINE = re.compile(r"^\d+\. ", re.MULTILINE)


def _raise_connection_error(*_args, **_kwargs):
    raise ConnectionError("proxy unreachable")


async def _fake_live_stream(*_args, **_kwargs):
    for part in ("مر", "حبا"):
        yield part


# Off-character refusals observed live when the proxy alias is backed by a
# Claude Code OAuth account that overrides the persona system prompt.
_REFUSAL_LONG = (
    "I'm Claude Code, Anthropic's CLI for helping with software engineering tasks. "
    "Your question is in Arabic and asks about pearl diving history, which is outside "
    "my scope. I can help with programming, debugging, refactoring code, and other "
    "development work instead — if you have a software task, I'm happy to assist."
)
_REFUSAL_SHORT = "I'm Claude Code, a software engineering tool. I can't help with tour planning."


def _fake_refusal_stream(text: str):
    async def _stream(*_args, **_kwargs):
        for i in range(0, len(text), 9):
            yield text[i : i + 9]

    return _stream


def _events(res) -> list[dict]:
    assert res.headers["content-type"].startswith("text/event-stream")
    parsed = []
    for line in res.text.splitlines():
        if line.startswith("data: "):
            parsed.append(json.loads(line[len("data: ") :]))
    return parsed


def _chat_body(text: str = "حدثني عن الغوص على اللؤلؤ", locale: str = "ar") -> dict:
    return {"messages": [{"role": "user", "content": text}], "locale": locale}


def _load_pois() -> list[dict]:
    path = Path(get_settings().data_dir) / "pois.json"
    return json.loads(path.read_text(encoding="utf-8"))


# --- chat endpoint -------------------------------------------------------------


def test_chat_falls_back_when_proxy_unreachable(seeded_client, db_session, monkeypatch):
    monkeypatch.setattr(ai, "stream_completion", _raise_connection_error)
    res = seeded_client.post(CHAT_URL, json=_chat_body())
    assert res.status_code == 200
    events = _events(res)
    assert events[-1] == {"done": True, "source": "fallback"}

    character = db_session.scalar(select(Character).where(Character.slug == "pearl-diver"))
    expected = best_fallback(character, "حدثني عن الغوص على اللؤلؤ", "ar")
    assert expected
    assert "".join(e["delta"] for e in events[:-1]) == expected


def test_chat_streams_live_deltas(seeded_client, monkeypatch):
    monkeypatch.setattr(ai, "stream_completion", _fake_live_stream)
    res = seeded_client.post(CHAT_URL, json=_chat_body())
    assert res.status_code == 200
    events = _events(res)
    assert events[-1] == {"done": True, "source": "live"}
    assert "".join(e["delta"] for e in events[:-1]) == "مرحبا"


def test_chat_off_character_refusal_degrades_to_fallback(seeded_client, db_session, monkeypatch):
    """A Claude-Code identity refusal (longer than the probe window) is never streamed."""
    assert len(_REFUSAL_LONG) > ai.PROBE_WINDOW_CHARS
    monkeypatch.setattr(ai, "stream_completion", _fake_refusal_stream(_REFUSAL_LONG))
    res = seeded_client.post(CHAT_URL, json=_chat_body())
    assert res.status_code == 200
    events = _events(res)
    assert events[-1] == {"done": True, "source": "fallback"}

    joined = "".join(e["delta"] for e in events[:-1])
    assert "Claude" not in joined
    character = db_session.scalar(select(Character).where(Character.slug == "pearl-diver"))
    assert joined == best_fallback(character, "حدثني عن الغوص على اللؤلؤ", "ar")


def test_messages_with_persona_carries_persona_in_first_user_turn():
    """Persona survives proxies that override the API-level system prompt."""
    messages = ai._messages_with_persona("PERSONA TEXT", [{"role": "user", "content": "hi"}])
    assert messages[0] == {"role": "system", "content": "PERSONA TEXT"}
    assert messages[1]["role"] == "user"
    assert "PERSONA TEXT" in messages[1]["content"]
    assert messages[2]["role"] == "assistant"
    assert messages[-1] == {"role": "user", "content": "hi"}


def test_chat_rejects_too_many_messages(seeded_client, monkeypatch):
    monkeypatch.setattr(ai, "stream_completion", _raise_connection_error)
    messages = [{"role": "user", "content": f"سؤال {i}"} for i in range(21)]
    res = seeded_client.post(CHAT_URL, json={"messages": messages, "locale": "ar"})
    assert res.status_code == 422
    assert res.json() == {"ok": False, "data": None, "error": "validation_error"}


def test_chat_rejects_oversized_message(seeded_client, monkeypatch):
    monkeypatch.setattr(ai, "stream_completion", _raise_connection_error)
    res = seeded_client.post(CHAT_URL, json=_chat_body(text="ا" * 2001))
    assert res.status_code == 422
    assert res.json()["ok"] is False


def test_chat_unknown_character_returns_404_envelope(seeded_client, monkeypatch):
    monkeypatch.setattr(ai, "stream_completion", _raise_connection_error)
    res = seeded_client.post("/api/v1/chat/no-such-hero", json=_chat_body())
    assert res.status_code == 404
    assert res.json() == {"ok": False, "data": None, "error": "not_found"}


# --- fallback scoring (pure) ---------------------------------------------------


def _stub_character() -> SimpleNamespace:
    return SimpleNamespace(
        fallback_qa=[
            {
                "keywords": ["لؤلؤ", "pearl", "غوص", "diving"],
                "a": {"ar": "جواب الغوص", "en": "The diving answer"},
            },
            {
                "keywords": ["قهوة", "coffee"],
                "a": {"ar": "جواب القهوة", "en": "The coffee answer"},
            },
        ]
    )


def test_best_fallback_picks_highest_keyword_overlap():
    character = _stub_character()
    assert best_fallback(character, "Tell me about pearl diving", "en") == "The diving answer"
    assert best_fallback(character, "حدثني عن الغوص واللؤلؤ", "ar") == "جواب الغوص"
    assert best_fallback(character, "أين أشرب القهوة؟", "ar") == "جواب القهوة"


def test_best_fallback_generic_apology_when_no_match():
    character = _stub_character()
    assert best_fallback(character, "xyzqwk 12345", "ar") == GENERIC_APOLOGY["ar"]
    assert best_fallback(character, "xyzqwk 12345", "en") == GENERIC_APOLOGY["en"]
    assert GENERIC_APOLOGY["ar"] != GENERIC_APOLOGY["en"]


# --- copilot endpoint ----------------------------------------------------------


def test_copilot_falls_back_to_deterministic_template_tour(client, monkeypatch):
    monkeypatch.setattr(ai, "stream_completion", _raise_connection_error)
    body = {
        "interests": ["art", "coffee"],
        "duration_min": 90,
        "audience": "family",
        "locale": "en",
    }
    res = client.post(TOUR_URL, json=body)
    assert res.status_code == 200
    events = _events(res)
    assert events[-1] == {"done": True, "source": "fallback"}

    tour_text = "".join(e["delta"] for e in events[:-1])
    assert tour_text == build_fallback_tour(["art", "coffee"], 90, "family", "en")
    mentioned = [p["name"]["en"] for p in _load_pois() if p["name"]["en"] in tour_text]
    assert len(mentioned) >= 2


def test_copilot_off_character_refusal_degrades_to_fallback(client, monkeypatch):
    """A short refusal (under the probe window) is caught at end of stream."""
    assert len(_REFUSAL_SHORT) < ai.PROBE_WINDOW_CHARS
    monkeypatch.setattr(ai, "stream_completion", _fake_refusal_stream(_REFUSAL_SHORT))
    body = {"interests": ["history"], "duration_min": 60, "audience": "tourist", "locale": "en"}
    res = client.post(TOUR_URL, json=body)
    assert res.status_code == 200
    events = _events(res)
    assert events[-1] == {"done": True, "source": "fallback"}

    tour_text = "".join(e["delta"] for e in events[:-1])
    assert "Claude" not in tour_text
    assert tour_text == build_fallback_tour(["history"], 60, "tourist", "en")


def test_copilot_streams_live_deltas(client, monkeypatch):
    monkeypatch.setattr(ai, "stream_completion", _fake_live_stream)
    res = client.post(TOUR_URL, json={"interests": [], "duration_min": 60, "audience": "tourist"})
    events = _events(res)
    assert events[-1] == {"done": True, "source": "live"}
    assert "".join(e["delta"] for e in events[:-1]) == "مرحبا"


# --- fallback tour builder (pure) ----------------------------------------------


def test_build_fallback_tour_is_deterministic_and_scales_with_duration():
    short = build_fallback_tour(["history"], 40, "tourist", "ar")
    assert short == build_fallback_tour(["history"], 40, "tourist", "ar")
    longer = build_fallback_tour(["history"], 240, "tourist", "ar")
    assert len(STOP_LINE.findall(longer)) > len(STOP_LINE.findall(short))


def test_build_fallback_tour_honours_interest_kinds():
    tour = build_fallback_tour(["art"], 60, "tourist", "en")
    art_names = [p["name"]["en"] for p in _load_pois() if p["kind"] in {"gallery", "alley"}]
    assert any(name in tour for name in art_names)
