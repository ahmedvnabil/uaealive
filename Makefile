COMPOSE := docker compose -f infra/docker-compose.yml

.PHONY: db dev-api dev-web seed test up

## Start the PostGIS database only (detached)
db:
	$(COMPOSE) up -d db

## Run the FastAPI backend with hot reload (from apps/api)
dev-api:
	cd apps/api && uvicorn app.main:app --reload --port 8000

## Run the Next.js frontend dev server (from apps/web)
dev-web:
	cd apps/web && npm run dev

## Seed the database from data/*.json
seed:
	cd apps/api && python -m app.seed

## Run backend tests
test:
	cd apps/api && pytest

## Build and start the full stack (db + api + web + nginx on :8080)
up:
	$(COMPOSE) up --build
