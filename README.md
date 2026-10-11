# Mano + Ojo

A bilingual business assistant for contractors: turn informal job descriptions into organized work, review missing details, and prepare customer-facing estimates.

**Live Demo: [https://www.manoformano.us](https://www.manoformano.us)**

## What is Mano?

Contractors often manage work through conversations, handwritten notes, and scattered messages. Mano helps a small service-business owner capture that information and understand what to do next without navigating a complicated business system.

The demo follows **Carlos**, a painting and drywall contractor. **Mano** helps interpret English or Spanish input and prepare documents. **Ojo** highlights missing information, suggests scope items, and surfaces next actions. Carlos reviews and approves customer-facing actions.

There is no login or authentication in this hackathon demo.

## Core Workflow

The FastAPI Job API supports this persisted workflow:

```text
Job description + explicit Business context
  → Job service resolves an existing Customer within that Business
  → deterministic completeness check
  → PostgreSQL stores NEW or NEEDS_INFORMATION
  → response includes status and missing_fields
  → PATCH the same Job after review
  → completeness is reevaluated without creating another Job
```

A Job is `NEW` only when its Customer is resolved, its `job_description` is meaningful, and its own `job_price` exists. Otherwise it is saved as `NEEDS_INFORMATION`, with missing fields such as `customer_name`, `job_description`, and `job_price`. Customer resolution never automatically creates a Customer; an unresolved Customer can remain `NULL`.

Explicit API inputs take priority over extracted values. AI proposes information; the Job service owns customer resolution, database writes, and completeness. Priced line items do not independently satisfy the Job-price requirement.

**Frontend persistence boundary:** the checked-in UI maintains browser-stored drafts and document state. New Jobs and edits are synchronized to FastAPI in the background through `/backend`, with the returned UUID stored as `backend_id`. Dashboard and detail reads still use browser storage, and frontend Ojo uses its own document-readiness checks. The API supports PostgreSQL Job reads and review updates, but this UI does not yet reload its Job list from PostgreSQL or use backend `missing_fields` as its review source. A browser refresh retains local drafts; another browser does not automatically load them. These UI states should not be confused with the authoritative backend completeness result.

## Features

- **Bilingual, responsive interface:** English and Spanish navigation, contractor onboarding, dashboard, Jobs, Customers, and document screens.
- **Job capture:** type a description or record audio for the existing FastAPI/ElevenLabs transcription endpoint; browser speech recognition is available as a fallback where supported.
- **AI assistance:** Gemini extracts structured work details and helps translate customer-facing scope into English. Backend extraction has a deterministic fallback when AI is unavailable.
- **Note scanning:** upload a note/photo or use the live-camera scanner on supported secure browser origins; Gemini reads the image into editable text.
- **Review and Ojo guidance:** editable work details, missing-information prompts, trade checklists, and next-action reminders.
- **PostgreSQL Job API:** Business-scoped creation/listing, Job reads and updates, lifecycle transitions, deletion, and a Business-scoped Customer listing endpoint.
- **Document demo:** estimate/invoice previews, customer estimate links and approval, scheduling, follow-up text, and manual payment markers. See the persistence limits below.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, Lucide icons |
| Backend | FastAPI, Pydantic, SQLAlchemy, Python 3.13 container |
| Database | PostgreSQL 17, psycopg |
| AI | Google Gemini, called from Next.js server routes and backend extraction |
| Voice | Browser MediaRecorder, FastAPI, ElevenLabs |
| Local runtime | Docker Compose; Node.js 24 frontend container |

## Architecture

```text
Next.js pages and components
  → frontend API helpers
  → /backend proxy (Next.js rewrite)
  → FastAPI routers
  → application services
  → PostgreSQL

Next.js /api/extract, /api/read-note, /api/ojo-suggest → Gemini
Browser audio → FastAPI /api/voice/transcribe → ElevenLabs
```

The frontend background-sync path is implemented in `frontend/src/lib/api.ts` and `frontend/src/lib/backend.ts`. Ojo's UI checklists and recommendations live in `frontend/src/lib/ojo.ts`.

`backend/app/db.py` is the authoritative SQLAlchemy model source. Backend entities use UUIDs; API IDs are UUID strings and monetary `Decimal` values are returned as strings. The browser UI has separate numeric draft IDs and retains backend UUIDs in `backend_id`.

## Try the Live Demo

1. Open **[https://www.manoformano.us](https://www.manoformano.us)**.
2. Choose English or Spanish. Use the welcome page's demo entry to explore sample work, or follow contractor onboarding.
3. Open **Nuevo trabajo** and type a job description. Voice and note capture require the relevant permissions and configured services.
4. Ask Mano to organize the information, review the work details, and explore the estimate preview and Ojo recommendations.

The welcome page's demo entry loads sample browser data; it is not an account login. Use non-sensitive demo information.

## Run Locally

Prerequisites: **Git** and **Docker Desktop with Docker Compose**, installed and running. Reserve ports **3000** and **8000**. Docker supplies Node.js, Python, and PostgreSQL; separate runtime installations are only needed for development checks outside Docker.

### 1. Create a workspace and clone

The optional Documents workspace keeps the repository in its own subdirectory. Skip the first two commands if you already have a preferred workspace.

macOS/Linux:

```sh
mkdir -p ~/Documents/Mano
cd ~/Documents/Mano
git clone https://github.com/ChrisFermin1/-MANO.git mano
cd mano
git switch dev
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path "$HOME/Documents/Mano"
Set-Location "$HOME/Documents/Mano"
git clone https://github.com/ChrisFermin1/-MANO.git mano
Set-Location mano
git switch dev
```

### 2. Configure environment

macOS/Linux:

```sh
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

`.env.example` is a safe template. Edit the ignored `.env` with your private local values before starting Docker. Set a local `POSTGRES_PASSWORD` and use the same password in `DATABASE_URL`. URL-encode password characters that have special meaning in a URL. The database hostname inside Compose is `postgres`.

Basic startup does not require AI keys. Add your own `GEMINI_API_KEY` for AI/image assistance and `ELEVENLABS_API_KEY` for server transcription. Never commit `.env` or put secrets in `NEXT_PUBLIC_*` variables.

If a PostgreSQL volume already exists, use its existing credentials. Editing `.env` does not change a password already stored in PostgreSQL.

### 3. Start Docker

Run from the repository root:

```sh
docker compose up -d --build --wait --wait-timeout 180
```

Useful commands:

```sh
# Status and recent logs
docker compose ps
docker compose logs --tail=100

# Rebuild after source changes
docker compose up -d --build --wait --wait-timeout 180

# Reload container environment after changing .env
docker compose up -d --force-recreate --wait --wait-timeout 180

# Stop services without deleting persisted PostgreSQL data
docker compose down
```

PostgreSQL uses the named `postgres_data` volume. Do not add `-v` to `down` unless you intend to delete that data. Fresh builds need internet access for dependencies and Google Fonts.

### 4. Open Mano

| Page/service | Local URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Dashboard | http://localhost:3000/inicio |
| Swagger API documentation | http://localhost:8000/docs |
| Backend health | http://localhost:8000/health |
| Proxied backend health | http://localhost:3000/backend/health |

The health response is `{"status":"ok"}`. FastAPI also verifies a PostgreSQL connection during startup.

Compose publishes frontend port 3000 on host interfaces, so another device on the same Wi-Fi can open `http://<your-computer-LAN-IP>:3000`, subject to firewall/network restrictions. Backend port 8000 is bound to `127.0.0.1`; PostgreSQL is not published. The `/backend` proxy lets phones use the backend without exposing port 8000.

Voice uploads currently use a separate URL pointing to port 8000 by default. This is not reachable from a phone with the default backend binding. Microphone and live-camera access require a secure origin, such as localhost or HTTPS; plain LAN HTTP is insufficient for these capabilities. The deployed HTTPS demo is separate from this local-network setup.

## Environment Variables

| Variable | Purpose and current behavior |
| --- | --- |
| `POSTGRES_USER` | PostgreSQL initialization user; Compose default `mano_local`. |
| `POSTGRES_PASSWORD` | Required private local database password. |
| `POSTGRES_DB` | PostgreSQL initialization database; Compose default `mano_local`. |
| `DATABASE_URL` | Required SQLAlchemy connection URL; use the `postgres` service hostname in Compose. |
| `SEED_DEMO_BUSINESS` | Creates the fixed demo Business if absent; defaults to `true`. |
| `CORS_ORIGINS` | JSON array of allowed direct browser origins; defaults to localhost ports listed in `.env.example`. Backend also allows local/private-network origins through its regex. |
| `GEMINI_API_KEY` | Server-side key for Next.js AI routes and backend extraction. |
| `GEMINI_MODEL` | Model requested by both AI implementations; Compose/code default `gemini-flash-lite-latest`. |
| `ELEVENLABS_API_KEY` | Server-side key required by FastAPI transcription. |
| `BACKEND_URL` | Next.js proxy destination; Compose sets `http://backend:8000` at build/runtime. Outside Docker, defaults to `http://127.0.0.1:8000`. |
| `NEXT_PUBLIC_MANO_BUSINESS_ID` | Optional frontend sync Business UUID override; defaults to the demo UUID below. |
| `NEXT_PUBLIC_VOICE_URL` | Optional frontend transcription endpoint override; defaults to the page's protocol/hostname on port 8000 at `/api/voice/transcribe`. |

Sharing a Gemini API key does not select the model: compare `GEMINI_MODEL` values to compare configurations. Changing root `.env` requires container recreation. Compose explicitly fixes `BACKEND_URL`; setting it in root `.env` does not override that mapping. The optional `NEXT_PUBLIC_*` variables are read by frontend code but are not forwarded by the current Compose configuration; for development outside Docker, set them in ignored `frontend/.env.local`. Public frontend variables and rewrite changes require a rebuild for production.

For `npm run dev` outside Docker, put server-side AI settings and any frontend overrides in `frontend/.env.local`. Root `.env` is consumed by Compose, not automatically by the separate Next.js development server.

## Demo Data

With `SEED_DEMO_BUSINESS=true`, backend startup creates this record if it does not exist, without overwriting an existing record:

```text
business_id:   00000000-0000-4000-8000-00000000ca71
business_name: Carlos Painting & Drywall
```

This is the explicit Business context for the hackathon; there is no authenticated current user. Startup does not seed Customers or Jobs. Existing Customer records must be provisioned separately for successful Customer resolution. Browser demo samples and onboarding preferences are separate from PostgreSQL records.

Startup uses `Base.metadata.create_all()` to create missing tables. It does not update existing columns or constraints; existing schema mismatches need a deliberate schema update.

## Development Checks

For checks outside Docker, install Python and Node.js (the container versions are Python 3.13 and Node.js 24).

Backend tests, from the repository root on macOS/Linux:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt -c requirements.lock
PYTHONPATH=backend .venv/bin/python -m unittest discover -s backend/tests -v
```

PowerShell equivalent:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt -c requirements.lock
$env:PYTHONPATH = "backend"
.venv/Scripts/python.exe -m unittest discover -s backend/tests -v
```

Frontend checks, starting from the repository root (both shells):

```sh
cd frontend
npm ci
npx tsc --noEmit --incremental false
npm run lint
npm run build
cd ..
```

For interactive frontend development, run `npm run dev` from `frontend/`; it uses port 3000. Stop the Docker frontend first if that port is occupied. Keep FastAPI available for background sync. The backend Docker image includes application code, not `backend/tests`, so run the test suite from the checkout as shown above.

Docker verification, from the root:

```sh
docker compose config --quiet
docker compose ps
```

Confirm all three containers are healthy and open the health URLs above. Unit tests cover extraction, Customer resolution, and completeness; they are not a substitute for browser/API/database integration testing.

## Project Structure

```text
frontend/
  src/app/              Pages, onboarding, Job/document views, Next.js API routes
  src/components/       UI, camera scanner, document and sharing components
  src/lib/              API/sync helpers, Mano, Ojo, translation, demo storage
  public/               Static assets
  next.config.ts        Backend proxy and Next.js configuration
backend/
  app/db.py             Authoritative SQLAlchemy Base and models
  app/main.py           FastAPI startup, CORS, health, voice endpoint
  app/schemas.py        API request/response contracts
  app/jobs.py           Job routes
  app/business.py       Business routes and demo initialization
  app/customers.py      Business-scoped Customer listing
  app/services/         Job logic, Customer lookup, extraction
  app/voice/            ElevenLabs transcription service
  tests/                Backend unit tests
docs/                   Requirements, architecture, technical design
AGENTS.md               Repository development instructions
requirements.txt        Backend dependencies
requirements.lock       Backend dependency constraints
.env.example            Safe local configuration template
docker-compose.yml      Frontend, backend, PostgreSQL services
```

## Notes and Demo Limitations

- The demo has no authentication or tenant access controls. Use demo data; it is not a production system for private customer records.
- Backend Job persistence is real, but frontend draft IDs, Business preferences, Customer grouping, and document state remain browser-managed in this checkout. Clearing browser storage removes the UI's local copies; there is no PostgreSQL rehydration path in the current UI.
- Frontend synchronization errors are shown on the Job page. Background sync does not guarantee that every visible browser change has been saved to PostgreSQL, and frontend Ojo readiness can differ from backend Job completeness.
- Estimates/invoices, manual payment markers, and follow-up/send controls are demo behavior, not a payment processor or persisted accounting system. Customer estimate approval uses a Next.js relay backed by a temporary JSON file; it is not durable PostgreSQL document storage and may be lost when its container is replaced.
- AI, image reading, and transcription depend on credentials, provider availability/quotas, and browser permissions. Failed extraction can fall back to simpler interpretation; do not assume every capture mode is available on every device.

Read [AGENTS.md](AGENTS.md) and the referenced project documentation before changing application behavior.
