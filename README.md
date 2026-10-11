# Mano + Ojo

Mano is a bilingual business assistant for contractors. The backend Job API uses
PostgreSQL. The current frontend still uses browser-stored demo jobs; connecting
those screens to the Job API is a separate integration phase. There is no login
or authentication.

## Prerequisites

- Git
- Docker Desktop with Docker Compose, installed and running
- Available local ports 3000 and 8000

Docker supplies Node.js 24, Python 3.13, and PostgreSQL 17. Teammates using Docker
do not need those runtimes installed separately.

## Start locally

```sh
git clone https://github.com/ChrisFermin1/-MANO.git mano
cd mano
git switch dev
cp .env.example .env
docker compose up --build --wait --wait-timeout 180
```

On PowerShell, use `Copy-Item .env.example .env`.

The example password is a local placeholder. If you change it, update both
`POSTGRES_PASSWORD` and the password inside `DATABASE_URL`. URL-encode special
characters in the database URL. Inside Compose, the database hostname is
`postgres`. Keep real secrets in the ignored `.env`, never in tracked files.

For an existing PostgreSQL volume, use its existing credentials. Changing `.env`
does not change a password already stored in PostgreSQL. Do not delete the volume
to resolve a credential mismatch if it contains data you want to keep.

Open:

- Frontend: http://localhost:3000
- Dashboard: http://localhost:3000/inicio
- FastAPI Swagger: http://localhost:8000/docs

The welcome page's demo link loads browser-only sample jobs. Onboarding also
stores its profile in the browser; neither currently changes PostgreSQL records.

Check backend health:

```sh
curl --fail http://localhost:8000/health
```

Expected: `{"status":"ok"}`.

Verify the containers and database connection:

```sh
docker compose ps
docker compose exec backend python -c 'from sqlalchemy import create_engine, text; from app.config import Settings; engine = create_engine(Settings().database_url); connection = engine.connect(); print(connection.execute(text("SELECT 1")).scalar_one()); connection.close(); engine.dispose()'
```

All three services should be healthy; the query should print `1`. PostgreSQL is
available on the Compose network and is not published to the host.

## Startup and demo data

FastAPI checks PostgreSQL connectivity before accepting requests, then calls
`Base.metadata.create_all()` using the models in `backend/app/db.py`. This creates
missing tables; it does not alter existing columns or constraints. Existing
schema mismatches require a separately reviewed schema update.

With `SEED_DEMO_BUSINESS=true`, startup creates the Business below if absent and
never overwrites it:

```text
00000000-0000-4000-8000-00000000ca71
Carlos Painting & Drywall
```

Startup does not create demo Customers or Jobs. The health endpoint reports
process health; it does not repeat the database query for every request.

## Configuration

See `.env.example`:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: PostgreSQL initialization.
- `DATABASE_URL`: SQLAlchemy connection URL.
- `SEED_DEMO_BUSINESS`: enables the existing demo Business initializer.
- `CORS_ORIGINS`: JSON array of allowed browser origins. Localhost and private
  network origins are also allowed by the backend's local-demo regex.
- `BACKEND_URL`: where the frontend's `/backend` route forwards to FastAPI
  (default `http://127.0.0.1:8000`; `http://backend:8000` inside Docker Compose).
- `NEXT_PUBLIC_VOICE_URL`: optional override for the voice transcription upload
  (default: port 8000 on the same host).
- `GEMINI_API_KEY`: optional for existing extraction. The backend falls back to
  deterministic extraction without it.
- `GEMINI_MODEL`: backend extraction model.
- `ELEVENLABS_API_KEY`: optional; required to use ElevenLabs transcription.

API keys are passed only to server containers. They are not public frontend
variables and are not needed for basic startup. Voice and AI integration testing
belongs to a later phase.

## Logs, rebuilds, and stopping

```sh
docker compose logs --tail=100
docker compose up --build --wait --wait-timeout 180
docker compose down
```

The named PostgreSQL volume retains data across restarts. The images contain
built code, so rebuild after source or frontend build-variable changes.

## Structure

```text
frontend/src/app/        Next.js pages and existing demo server routes
frontend/src/components/ Shared frontend components
frontend/src/lib/        Frontend helpers and browser demo storage
backend/app/             FastAPI application, models, schemas, routers, services
backend/tests/           Backend unit tests
docs/                    Requirements, architecture, and technical design
requirements.txt         Backend dependencies
requirements.lock        Backend dependency constraints used by Docker
```

Read `AGENTS.md` and its referenced documentation before changing behavior.
`backend/app/db.py` is the authoritative model source.

## Development checks outside Docker

With Node.js and Python installed locally:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt -c requirements.lock
PYTHONPATH=backend .venv/bin/python -m unittest discover -s backend/tests -v
cd frontend
npm ci
npx tsc --noEmit --incremental false
npm run build
```

For frontend development, run `npm run dev` from `frontend/` on port 3000 while
FastAPI is running. To point it at a different FastAPI outside Docker,
set `BACKEND_URL` in an ignored `frontend/.env.local` and restart Next.js. Both development and production frontend servers use port 3000.
