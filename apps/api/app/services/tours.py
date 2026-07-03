"""Deterministic fallback tour builder + live copilot prompts over the real POI catalog."""

import json
from functools import lru_cache
from pathlib import Path

from app.config import get_settings

MINUTES_PER_STOP = 20
MIN_STOPS = 2
MAX_STOPS = 8

INTEREST_KINDS: dict[str, tuple[str, ...]] = {
    "history": ("museum", "landmark", "house"),
    "تاريخ": ("museum", "landmark", "house"),
    "heritage": ("house", "landmark", "mosque"),
    "تراث": ("house", "landmark", "mosque"),
    "architecture": ("house", "mosque", "viewpoint", "landmark"),
    "عمارة": ("house", "mosque", "viewpoint", "landmark"),
    "art": ("gallery", "alley"),
    "فن": ("gallery", "alley"),
    "coffee": ("cafe", "museum"),
    "قهوة": ("cafe", "museum"),
    "food": ("cafe",),
    "طعام": ("cafe",),
    "culture": ("museum", "mosque", "house"),
    "ثقافة": ("museum", "mosque", "house"),
}

_INTRO = {
    "ar": "جولة سيراً على الأقدام في حي الفهيدي التاريخي (حوالي {duration} دقيقة — {audience}):",
    "en": (
        "A walking tour of Al Fahidi Historical District "
        "(about {duration} minutes — {audience}):"
    ),
}
_OUTRO = {
    "ar": "اختم جولتك عند ضفة الخور مع النسيم، ولا تنسَ الماء وحذاءً مريحاً للمشي.",
    "en": "Finish your walk by the Creek breeze — bring water and comfortable walking shoes.",
}


@lru_cache(maxsize=1)
def _catalog() -> tuple[dict, ...]:
    """The committed POI knowledge base, sorted in district walking order."""
    path = Path(get_settings().data_dir) / "pois.json"
    pois = json.loads(path.read_text(encoding="utf-8"))
    return tuple(sorted(pois, key=lambda p: (p.get("order", 0), p["slug"])))


def _matched_kinds(interests: list[str]) -> set[str]:
    kinds: set[str] = set()
    for interest in interests:
        kinds.update(INTEREST_KINDS.get(interest.strip().casefold(), ()))
    return kinds


def _select_stops(interests: list[str], duration_min: int) -> list[dict]:
    stop_count = max(MIN_STOPS, min(MAX_STOPS, duration_min // MINUTES_PER_STOP))
    catalog = _catalog()
    kinds = _matched_kinds(interests)
    chosen = [p for p in catalog if not kinds or p["kind"] in kinds][:stop_count]
    if len(chosen) < stop_count:
        seen = {p["slug"] for p in chosen}
        extras = [p for p in catalog if p["slug"] not in seen]
        chosen += extras[: stop_count - len(chosen)]
    return sorted(chosen, key=lambda p: (p.get("order", 0), p["slug"]))


def build_fallback_tour(interests: list[str], duration_min: int, audience: str, locale: str) -> str:
    """Deterministic canned itinerary over real POIs, kept in district walking order."""
    lang = locale if locale in ("ar", "en") else "en"
    lines = [_INTRO[lang].format(duration=duration_min, audience=audience)]
    for index, poi in enumerate(_select_stops(interests, duration_min), start=1):
        lines.append(f"{index}. {poi['name'][lang]} — {poi['summary'][lang]}")
    lines.append(_OUTRO[lang])
    return "\n".join(lines)


def build_live_tour_prompt(
    interests: list[str], duration_min: int, audience: str, locale: str
) -> tuple[str, str]:
    """Build the (system, user) prompt pair for the live copilot model.

    The system prompt grounds the model in the real POI catalog so it cannot
    invent places; the user prompt carries the visitor's request.
    """
    language = "Modern Standard Arabic" if locale == "ar" else "English"
    catalog_lines = "\n".join(
        f"- {p['name']['en']} / {p['name']['ar']} "
        f"(kind: {p['kind']}, walk order: {p.get('order', 0)}): {p['summary']['en']}"
        for p in _catalog()
    )
    system = (
        "You are the tour-planning copilot for the Al Fahidi Historical District in Dubai. "
        "Craft a realistic walking itinerary using ONLY the real places listed below, keeping "
        "a sensible walking order (lower walk order = earlier in the district walk). Give a "
        f"short time estimate per stop, reply in {language}, stay warm and concise, and never "
        "invent places, prices, or opening hours.\n"
        "FORMAT: plain text only — NO markdown, asterisks, hashes, or horizontal rules. "
        "Optionally open with one short intro line, then one numbered stop per line as "
        "'1. Place name (~N min) — what to see there.', then one short closing line.\n\n"
        f"Places:\n{catalog_lines}"
    )
    user = (
        f"Plan a tour. Interests: {', '.join(interests) if interests else 'general'}. "
        f"Total duration: about {duration_min} minutes. Audience: {audience}."
    )
    return system, user
