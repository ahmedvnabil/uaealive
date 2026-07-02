# UAE ALIVE — Architecture

## System diagram

```
                        Browser (ar RTL / en LTR)
                                  │
                        http://localhost:8080
                                  │
                          ┌───── nginx ─────┐
                          │  /api/* → api   │
                          │  /*     → web   │
                          └───┬───────┬─────┘
                              │       │
            ┌── FastAPI :8000 ┘       └ Next.js :3000 ──┐
            │  /api/v1 envelope {ok,data,error}         │  App Router, next-intl,
            │  SSE: /chat/{slug}, /copilot/tour         │  R3F twin, MapLibre map,
            │  slowapi rate limits, admin Bearer auth   │  typed api client (SSE reader)
            └───┬──────────────────────┬────────────────┘
                │                      │
        PostGIS :5433           LiteLLM proxy (server-side only)
        (SQLAlchemy 2 +         chat: claude-account-haiku-4-5
         GeoAlchemy2,           copilot: claude-account-sonnet-4-6
         Alembic)               fallback: keyword-scored canned answers

   Offline asset pipeline (local GPU, not in serving path):
   ComfyUI SDXL → hero art JPEGs · Kokoro TTS → EN narration MP3s
   scripts/fetch_osm.py → data/geo/alfahidi.geojson (committed)
```

## Key decisions

- **One envelope, two exceptions.** Every JSON response is `{ok, data, error}` — including 422s and 429s via global handlers. SSE streams and `/geo/district` (raw GeoJSON FeatureCollection) are the documented exceptions.
- **AI stays server-side.** The browser never sees the LiteLLM key; chat/copilot are SSE endpoints (`data: {"delta"}` … `data: {"done": true, "source": "live"|"fallback"}`). When the proxy is unreachable, `services/fallback.py` scores the character's `fallback_qa` by keyword overlap so the demo never dies.
- **GeoJSON is the single geometry source.** The map (MapLibre fill-extrusion) and the 3D twin (`geoToMesh.ts` → THREE.Shape extrusion) render the same committed OSM-derived file served by the API. Buildings carry `height`, `barjeel`, `poi_slug` properties.
- **Bilingual by column, localized at the edge.** DB stores `_ar`/`_en` columns; Pydantic DTOs expose `{ar, en}` objects; the client picks per locale. UI strings live in 10 per-page message namespaces × 2 locales (so parallel work never collides).
- **Anonymous identity.** `device_id` (UUID v4 in localStorage) scopes hunt progress and analytics — no accounts in v1.
- **Content moderation is a state machine.** Submissions land `pending` (HTML-stripped server-side); admin approves/rejects via Bearer-authenticated endpoints (`secrets.compare_digest`).
- **Assets are reviewed, not trusted.** SDXL renders went through per-image visual review; three POIs (mosque, wind-tower house, old wall) keep purpose-drawn SVGs because generated art couldn't match their documented geometry. English narration is pre-rendered MP3 (Kokoro); Arabic uses browser speechSynthesis — the local Qwen TTS failed Arabic (spelled letters individually).

## Repo layout

```
data/            knowledge base (17 POIs, 51 stories, 5 characters, timeline,
                 events, hunt) + geo/alfahidi.geojson — all validated by
                 scripts/validate_data.py
apps/api/        FastAPI (models, schemas, routers, services, alembic, 50 tests)
apps/web/        Next.js 15 (App Router pages, components per experience,
                 messages/{ar,en}/*, e2e smoke suite)
infra/           docker-compose.yml + nginx.conf
scripts/         fetch_osm.py (regenerate GeoJSON), validate_data.py
docs/            this file, runbook, openapi.json, review-log, spec + plan
```

## Scale-out path (post-v1)

The district is data, not code: adding a new historical district = new GeoJSON + new `data/*.json` rows (the schema already keys everything by slug). The AI layer, map/twin renderers, hunt, and CMS are district-agnostic.
