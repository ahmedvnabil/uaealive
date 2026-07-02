# UAE ALIVE — الإمارات حيّة

**AR** — منصة تراثية تفاعلية تجمع الذكاء الاصطناعي والواقع المعزز عبر المتصفح لإحياء حي الفهيدي التاريخي في دبي: خريطة تفاعلية، توأم رقمي ثلاثي الأبعاد، قصص ثنائية اللغة، شخصيات تاريخية تحاورك، ورحلة بحث عن الكنز بين الأزقة والبراجيل.

**EN** — An AI + WebAR heritage platform that brings Al Fahidi Historical District (Dubai) to life in the browser: an interactive map, a 3D digital twin across eras, bilingual stories, historical characters you can talk to, and a scavenger hunt through the alleys and wind towers.

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript strict, Tailwind, React Three Fiber, MapLibre GL, next-intl (Arabic-first, RTL)
- **Backend:** FastAPI, SQLAlchemy 2, GeoAlchemy2, Alembic, Pydantic v2 — `/api/v1` with `{ok, data, error}` envelope
- **Data:** PostGIS (postgis/postgis:16-3.4), seed knowledge base in `data/*.json`, OSM-derived GeoJSON
- **AI:** server-side via LiteLLM proxy, with canned-answer fallback
- **Infra:** Docker Compose + nginx (everything on `http://localhost:8080`)

## Quickstart

```bash
cp .env.example .env        # fill in LITELLM_API_KEY, ADMIN_PASSWORD

# Option A — full stack in Docker
make up                     # http://localhost:8080

# Option B — local dev
make db                     # PostGIS on localhost:5433
make seed                   # load seed content
make dev-api                # FastAPI on :8000
make dev-web                # Next.js on :3000
make test                   # backend tests
```

> Full documentation (architecture, endpoints, deployment) is completed in Task 20.
