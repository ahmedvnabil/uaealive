# UAE ALIVE v1 — Design Spec
**Date:** 2026-07-02 · **Status:** Approved by user (demo + real backend in parallel)

## 1. Goal

A browser-based AI + WebAR heritage platform for **Al Fahidi Historical District (Al Bastakiya), Dubai**. v1 is a polished, working demo suitable for judges/investors/government audiences, built on a real production-grade backend that can grow into the full "AI Heritage Operating System" described in the master prompt.

**Non-goals for v1 (deferred, architecture allows later):** real photogrammetry / Gaussian splatting, ElevenLabs/Whisper, SDXL photo restoration, Qdrant, MinIO, Redis, full 7-language content (structure ships, AR+EN content ships), multi-district scaling, real user accounts.

## 2. Architecture

Monorepo:

```
uaealive/
├── apps/web        Next.js 15 (App Router) + TypeScript + Tailwind + React Three Fiber + MapLibre GL
├── apps/api        FastAPI + SQLAlchemy 2 + GeoAlchemy2 + PostgreSQL/PostGIS + Alembic
├── data/           Knowledge base (seed): pois.json, stories.json, timeline.json, characters.json,
│                   events.json, geo/alfahidi.geojson (from OSM, committed — no runtime Overpass dependency)
├── infra/          docker-compose.yml (postgis, api, web, nginx), nginx.conf
└── docs/           architecture, runbook, OpenAPI export, this spec
```

- **AI access:** via the user's LiteLLM proxy (OpenAI-compatible). Base URL + key **only** in `.env`
  (`LITELLM_BASE_URL`, `LITELLM_API_KEY`). Verified working 2026-07-02; available models include
  `claude-account-haiku-4-5` (characters chat), `claude-account-sonnet-4-6` (Copilot).
  Model names configurable via env (`AI_MODEL_CHAT`, `AI_MODEL_COPILOT`).
- **All AI calls go through FastAPI** (SSE streaming to browser). The key never reaches the client.
- **Fallback:** if the proxy errors/times out, the chat endpoint serves curated per-character canned
  answers from the knowledge base (matched by simple keyword scoring), flagged `"source": "fallback"`.
  The demo can never die on stage.

## 3. Data model (PostGIS)

- `pois` — id, slug, name_ar/en, kind (house/museum/mosque/alley/landmark/cafe), geom (Point 4326),
  summary_ar/en, era_built, accessibility flags, hero_image, order
- `stories` — poi_id FK, audience (tourist/kids/expert), title_ar/en, body_ar/en, sources[]
- `timeline_periods` — key (1900/1950/1970/1990/today/future), name, description, palette hints for 3D
- `characters` — slug, name_ar/en, role, persona_prompt, greeting_ar/en, fallback_qa (jsonb)
- `events` — title, date range, kind (festival/market/ramadan/national-day), location
- `submissions` — community contributions (type, payload, contact, status pending/approved/rejected)
- `treasure_hunt_stops` + `badges` + `visits` (anonymous device-id based)
- `analytics_events` — lightweight (page, poi, lang, ts) for the admin dashboard

Seed pipeline: `apps/api/seed.py` loads `data/*.json` idempotently. GeoJSON of the district
(buildings, alleys, POI coordinates) is generated once from OpenStreetMap and committed.

## 4. API surface (FastAPI, `/api/v1`)

Public: `GET /pois`, `GET /pois/{slug}`, `GET /stories`, `GET /timeline`, `GET /characters`,
`GET /events`, `GET /geo/district` (GeoJSON), `POST /chat/{character}` (SSE), `POST /copilot/tour` (SSE),
`POST /community/submissions`, `POST /hunt/checkin`, `POST /analytics/track`.
Admin (Bearer token from `ADMIN_PASSWORD` env): CRUD on pois/stories/events, submissions moderation
queue (approve/reject), `GET /admin/analytics/summary`.
Consistent envelope `{ok, data, error}`; rate limiting (slowapi) on chat/copilot/submissions;
input validation via Pydantic everywhere. OpenAPI docs at `/docs`.

## 5. Frontend (Arabic-first, RTL, dark-first, luxury — tasteful glass accents, no clutter)

Routes (App Router, `ar` default + `en`):
1. `/` — cinematic landing: hero with animated district silhouette, sections for the 5 pillars, CTA
2. `/map` — MapLibre custom heritage style; real Al Fahidi footprints; POI markers → story drawer
3. `/twin` — R3F stylized low-poly digital twin generated from real footprints (extruded + wind-tower
   (barjeel) tops on flagged buildings, palm trees, creek plane); **era slider** (1950/1970/1990/Today)
   morphs lighting, materials, props; click building → info card
4. `/stories` + `/stories/[slug]` — story pages, audience toggle (kids/tourist/expert), image gallery,
   Web Speech API narration (ar-AE / en voices)
5. `/characters` + chat UI — streaming SSE chat with historical characters, Arabic/English
6. `/ar-experience` — WebAR: camera + floating labels + old-photo alignment overlay (MindAR image
   tracking where a printed/on-screen marker is available; device-orientation "magic window" otherwise);
   desktop = simulated AR mode over a 360-ish backdrop
7. `/hunt` — treasure hunt: map of stops, code entry check-in, badge collection
8. `/admin` — CMS: login, POI/story/event tables with edit forms, moderation queue, analytics dashboard
   (visitors, top POIs, languages, chat usage — Chart.js or lightweight SVG charts)

Design system: single `theme.ts` + Tailwind config — deep desert-night palette, gold/sand accents,
Arabic display font (e.g. `Noto Kufi Arabic`/`Cairo`) + Latin pairing, consistent motion language
(Framer Motion), dark mode primary / light mode supported. Accessibility: semantic HTML, ARIA,
keyboard nav, `prefers-reduced-motion`, high-contrast toggle, screen-reader friendly labels.

## 6. Content (must be genuinely researched, AR + EN)

≥15 real POIs (e.g. Sheikh Saeed Al Maktoum House*, wind-tower houses of Al Bastakiya, Coffee Museum,
SMCCU, Coin Museum, XVA, Arabian Tea House, mosque, art alleys, creek edge), each with tourist/kids/expert
story variants and cited sources; ≥5 characters (pearl diver, textile merchant, master builder,
Emirati grandmother, historian guide); timeline narrative for each era; ≥6 events (heritage festival,
Ramadan nights, National Day…). *Adjacent landmark — labelled as such.
Content written during build by research/content agents; every factual claim gets a `sources` entry.

## 7. Quality & delivery

- API: pytest + httpx — core endpoints, chat fallback path, moderation flow, seed idempotency.
- Web: `next build` must pass typecheck/lint; Playwright smoke (landing renders AR RTL, map loads,
  chat fallback works) if time allows.
- Security: key server-side only, parameterized ORM queries, sanitized submissions, rate limits,
  no secrets in repo (`.env.example` provided).
- `docker compose up` boots everything; `make dev` for local dev; README (AR+EN) + runbook; Coolify-ready.

## 8. Execution model

Multi-agent workflows (ultracode): parallel research/content generation, GIS data prep, backend build,
frontend build per-route, then adversarial code review (security + code quality) and fix rounds,
finishing with an end-to-end verification pass in a real browser.
