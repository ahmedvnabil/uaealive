# Adversarial Review Log

Every phase shipped through independent adversarial verification (fresh-context
reviewers instructed to refute, not confirm). Findings and their resolutions:

## Phase 1 — data & scaffold
- **Overpass bbox straddling:** 10 OSM buildings had centroids outside the district bbox → dropped; edge vertices clamped. *Resolved in `fetch_osm.py`.*
- **Majlis Gallery unmapped in OSM** (and reportedly closed ~2020) → address-based coordinates; content written to honor its 1989 founding without asserting it is open. *Accepted risk, documented.*
- Independent re-run of `scripts/validate_data.py`: **all checks passed** (17 POIs, 51 stories, 5 characters, 4 eras, 7 events, 6+4 hunt, 254 geo features).

## Phase 2 — API + web foundation
- Verifier ran the full suite (50 tests), `alembic upgrade head`, double-seed idempotency, 26 scripted curl contract checks, live SSE through the real LiteLLM proxy, and a 61-request rate-limit probe (60×200 → 1×429 envelope). **Passed.**
- **Secret scan:** first 12 chars of the real key grepped across repo, `.git` objects, both venvs, `.next` — zero hits outside `.env`. **Passed.**
- Minor (accepted): Tailwind v4 is CSS-first so no `tailwind.config.ts` — tokens live in `globals.css` `@theme` + `theme.ts`, verified present in built CSS.

## Phase 3 — nine experiences
- Build verifier: zero type errors, vitest green, hex-color audit clean (tokens only), i18n audit — ar/en key sets identical across all 10 namespaces, file-size cap respected (max 388 lines). **Passed.**
- Functional verifier: 114 browser checks across 11 routes × 2 locales (real Chromium, real WebGL) — map markers, twin canvas, chat streaming through the live proxy, hunt error states, admin auth. **Effective 100% pass.**
- **Fixed:** AR mode CTAs had a pre-hydration dead-click window → buttons now disabled until mounted. Map effect cleanup captured a live ref → local capture. E2E port added to `CORS_ORIGINS`.

## Phase 3.5 — GPU assets (solo, per-image review)
- All 23 SDXL renders individually viewed against the art direction (night-gold flat illustration, square barjeel not Ottoman minarets, no modern skyline).
- **Rejected & regenerated (6):** majlis-gallery (daylight pink), creek-edge + panorama (modern skyscrapers), wind-tower-house (art-deco towers), mosque (Ottoman domes), old-city-wall (daylight ruin).
- **Second round:** 3 regenerations accepted; **3 POIs reverted to purpose-drawn SVGs** (wind-tower-house, al-fahidi-mosque, old-city-wall) — SDXL repeatedly failed their real geometry; historical accuracy outranks polish.
- Arabic TTS (Qwen 1.7B base) failed a round-trip test — it spelled Arabic letter-by-letter (verified by Whisper transcription). **Arabic narration stays on browser speechSynthesis; only English uses pre-rendered audio.**

## Phase 4 — hardening & packaging
- E2E smoke: 6/6 green against the live stack (RTL/LTR shells, map deep link, narration + audience toggle, streamed chat round-trip, hunt wrong-code rejection).
- Dockerfiles added (compose referenced them but they never existed — caught in packaging review); compose now mounts `data/` read-only and bakes `NEXT_PUBLIC_API_URL` at build; fresh `docker compose up --build` verified end-to-end through nginx.
