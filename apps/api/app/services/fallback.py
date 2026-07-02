"""Curated per-character canned answers, matched by keyword-overlap scoring."""

from typing import Any

GENERIC_APOLOGY = {
    "ar": (
        "سامحني يا صديقي، هذا سؤال لا أملك له جواباً الآن. "
        "اسألني عن حي الفهيدي وأهله وأيامه القديمة وسأحدثك بما أعرف."
    ),
    "en": (
        "Forgive me, friend — I have no answer for that just now. "
        "Ask me about Al Fahidi, its people, and the old days, and I will tell you what I know."
    ),
}


def _score(keywords: list[str], text: str) -> int:
    return sum(1 for keyword in keywords if keyword and keyword.casefold() in text)


def _localized_answer(answer: dict, locale: str) -> str:
    return answer.get(locale) or answer.get("ar") or answer.get("en") or ""


def best_fallback(character: Any, user_text: str, locale: str) -> str:
    """Pick the canned answer whose keywords overlap the user text the most.

    ``character`` is anything exposing a ``fallback_qa`` list of
    ``{"keywords": [...], "a": {"ar": ..., "en": ...}}`` items. Substring
    matching (case-folded) keeps Arabic prefixes like ``ال`` matching.
    Falls back to a generic in-character apology when nothing scores.
    """
    text = user_text.casefold()
    best_answer = ""
    best_score = 0
    for qa in character.fallback_qa or []:
        score = _score(qa.get("keywords", []), text)
        if score > best_score:
            best_score = score
            best_answer = _localized_answer(qa.get("a", {}), locale)
    if best_score > 0 and best_answer:
        return best_answer
    return GENERIC_APOLOGY.get(locale, GENERIC_APOLOGY["en"])
