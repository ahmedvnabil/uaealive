# UAE ALIVE — Runbook

## Environments

| Mode | Command | URL |
|---|---|---|
| Full stack (Docker) | `make up` | http://localhost:8080 (nginx) |
| Dev API | `make db && make dev-api` | http://localhost:8000 |
| Dev web | `make dev-web` | http://localhost:3000 |

`.env` at the repo root drives both apps (see `.env.example`). The API resolves it from any CWD; Docker Compose passes the same vars through.

## Database

```bash
make db                                  # PostGIS on localhost:5433 (uae/uae, db uaealive)
cd apps/api
.venv/bin/alembic upgrade head           # migrate
.venv/bin/python -m app.seed             # idempotent upsert from data/*.json
```

The Docker api container runs `alembic upgrade head && python -m app.seed` on every boot — safe because seed upserts by slug/key.

Test DB: `uaealive_test` on the same instance (created automatically by `tests/conftest.py` expectations; create manually with `CREATE DATABASE uaealive_test;` if missing).

## Tests

```bash
cd apps/api && .venv/bin/python -m pytest -q     # 50 tests against real PostGIS
cd apps/api && .venv/bin/ruff check .
cd apps/web && npx tsc --noEmit && npm run build
cd apps/web && npx vitest run                    # geoToMesh unit tests
cd apps/web && npx playwright test               # E2E smoke — needs API on :8000
```

E2E starts (or reuses) the dev server on :3000; `CORS_ORIGINS` already allows it.

## Content pipeline

- **Edit content:** change `data/*.json`, run `python3 scripts/validate_data.py` (must stay green), then re-seed.
- **Regenerate geodata:** `python3 scripts/fetch_osm.py` (Overpass mirrors with retry; output is committed, don't regenerate casually).
- **GPU hero art / narration:** local GPU server (Coolify at 192.168.70.220, Host-header routing `<app>.192.168.70.220.sslip.io`). SDXL via ComfyUI `/prompt` API; Kokoro TTS via voicebox `/openai/v1/audio/speech`. Every generated image gets a human/agent visual review before wiring (see review-log). The mosque, wind-tower-house, and old-city-wall heroes intentionally stay SVG.
- **Narration manifest:** `apps/web/src/lib/narrationManifest.ts` must list exactly the slugs present in `apps/web/public/audio/pois/`.

## Secrets

- `LITELLM_API_KEY` lives ONLY in `.env` (gitignored) and container env — never in code, logs, or the browser. `.env.example` carries placeholders.
- Rotation: update `.env`, restart api (`docker compose -f infra/docker-compose.yml restart api` or restart uvicorn). Verify with one `/api/v1/chat/*` request (final SSE event should say `"source": "live"`).
- `ADMIN_PASSWORD` doubles as the admin Bearer token; rotate the same way. Sessions (sessionStorage tokens) invalidate on next request automatically.

## Deploy (Coolify)

1. Push the repo to a Git remote Coolify can reach.
2. Create a Docker Compose resource pointing at `infra/docker-compose.yml`.
3. Set env vars in Coolify UI: `LITELLM_BASE_URL`, `LITELLM_API_KEY`, `AI_MODEL_CHAT`, `AI_MODEL_COPILOT`, `ADMIN_PASSWORD`, `CORS_ORIGINS` (the public origin), `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` (the public origin — both baked at web build; `SITE_URL` drives `robots.txt`/`sitemap.xml`). `API_INTERNAL_URL` (default `http://api:8000`) is what the web container uses for **server-side** rendering — keep it pointed at the API service over the internal network, never at the public origin (that would loop back to the web container itself and blank out server-rendered pages like `/stories/[slug]`).
4. Map the domain to the nginx service (port 80 in-container / 8080 mapping locally).
5. **HTTPS is required** for camera AR on mobile (localhost is exempt during development).

## Common issues

| Symptom | Fix |
|---|---|
| Chat replies with «وضع غير متصل» chip | LiteLLM unreachable — check `LITELLM_BASE_URL`/key; fallback is by design |
| Map/twin blank in headless browsers | Software WebGL: launch Chromium with `--use-gl=angle` or `--enable-unsafe-swiftshader` |
| Browser API calls blocked by CORS in local rigs | Add your origin to `CORS_ORIGINS`, restart api |
| `docker compose` missing on macOS | `brew install docker-compose` + add `/opt/homebrew/lib/docker/cli-plugins` to `~/.docker/config.json` `cliPluginsExtraDirs` |
| Emulated amd64 PostGIS is slow on Apple Silicon | Expected (no arm64 postgis:16-3.4 image locally); tests just run slower |
