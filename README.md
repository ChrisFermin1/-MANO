# Mano + Ojo

Bilingual business assistant for contractors. This repository currently contains
only the local development foundation: a Next.js home page, FastAPI health
endpoint, and PostgreSQL. Product workflows are not implemented.

## Prerequisites

- Git
- Docker Desktop with Docker Compose (installed, running, and unpaused), or Docker Engine with Compose v2+
- Available local ports 3000 and 8000

Node.js, Python, and PostgreSQL do not need to be installed on your computer when
using Docker. The images provide Node.js 24, Python 3.13, and PostgreSQL 17.

## Start locally

```sh
git clone https://github.com/ChrisFermin1/-MANO.git mano
cd mano
cp .env.example .env
docker compose up --build --wait --wait-timeout 180
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

The example contains local-only placeholder credentials. You can use them for
this local setup or replace the password in both `POSTGRES_PASSWORD` and
`DATABASE_URL` before starting. Keep the username and database name in sync too.
URL-encode any special characters in the URL password. The database hostname
must be `postgres` inside Compose. No real secrets belong in `.env.example`.
`.env` is ignored by Git and excluded from Docker builds.

Leave `GEMINI_API_KEY` empty for now; this foundation does not call Gemini.

Open the frontend at **http://localhost:3000**. It should say “The frontend is running.”

Check the backend:

```sh
curl --fail http://localhost:8000/health
```

Expected response: `{"status":"ok"}`. The backend checks PostgreSQL with `SELECT 1`
before accepting requests; startup fails if the database connection fails.
The health endpoint itself is a simple process health check.

Verify the containers and database connection:

```sh
docker compose ps
docker compose exec backend python -c 'from sqlalchemy import create_engine, text; from app.config import Settings; engine = create_engine(Settings().database_url); connection = engine.connect(); print(connection.execute(text("SELECT 1")).scalar_one()); connection.close(); engine.dispose()'
```

All three services should be healthy; the database query should print `1`.
PostgreSQL is accessible inside the Compose network and is not published to the host.

## Logs and stopping

```sh
docker compose logs --tail=100
docker compose down
```

Database data persists in a named Docker volume across restarts. Changing the
PostgreSQL credentials in `.env` does not change credentials in an existing volume.
For a disposable local database only, `docker compose down --volumes` deletes
that data so it can be initialized again.

The containers run built application code. After source changes, rerun
`docker compose up --build --wait --wait-timeout 180`.

## Structure

```text
frontend/              Next.js + TypeScript, Tailwind CSS, shadcn/ui configuration
backend/app/           FastAPI application and environment configuration
backend/Dockerfile     Backend image, using the root Python dependency files
docs/                  Approved requirements, architecture, and technical design
AGENTS.md              Development instructions
requirements.txt       Existing backend dependency declarations
requirements.lock      Pinned backend dependencies used by Docker
docker-compose.yml     Frontend, backend, PostgreSQL, and startup health checks
.env.example           Local environment placeholders
```

Frontend dependencies are pinned in `frontend/package-lock.json` and installed
with `npm ci`. Tailwind v4 uses `frontend/postcss.config.mjs` and
`frontend/src/app/globals.css`. shadcn/ui is prepared with `components.json`,
theme tokens, aliases, and the `cn` helper; no product components are installed.

Read `AGENTS.md` and its referenced documents before implementing behavior.
