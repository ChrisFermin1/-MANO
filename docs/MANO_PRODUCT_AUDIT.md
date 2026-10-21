# Mano — Product & Technical Audit

*2026-10-20 · branch `abe/experiments` · audit and planning only (no code was changed for this document)*

Companion docs: [Jobber comparison](MANO_JOBBER_COMPARISON.md) · [Implementation roadmap](MANO_IMPLEMENTATION_ROADMAP.md) ·
[Architecture proposal](MANO_ARCHITECTURE_PROPOSAL.md) · [Pricing strategy](MANO_PRICING_STRATEGY.md)

## Executive summary

Mano's **front end is far ahead of its foundation.** The contractor-facing experience (Spanish-first, voice/photo/typed
job capture, English estimates and invoices, client approval link, payments recorded by hand, Ojo's next step, client
pages, bilingual PDFs) is designed, built and tested on phone, tablet and desktop. But almost all of it runs **in each
phone's browser** (`localStorage` + IndexedDB). Josh's backend (FastAPI + Postgres) holds a partial copy of jobs only.

That means Mano today is a very convincing **single-device prototype**, not yet a multi-user product:

- No real accounts: login is a fake layer (`frontend/src/lib/auth.ts`); the backend has no authentication at all and
  trusts any `business_id` it's given.
- Clients, estimates, invoices, payments, photos and plans are not stored on the server.
- Client links only work on the developer's Wi-Fi (a demo relay, `frontend/src/lib/demo-relay-server.ts`).
- No online payments, no messages sent by the server (all sending is through the owner's own WhatsApp/SMS).

**The single most important next step is foundation, not features:** make the backend the source of truth (accounts,
organizations, customers, estimates, invoices, payments, files), behind the screens that already exist. Every
Jobber-style feature in the roadmap depends on it.

## 1. Existing architecture

| Layer | What it is | Evidence |
|---|---|---|
| Front end | Next.js 15 (App Router, client components), TypeScript, Tailwind v4, lucide icons, `@react-pdf/renderer`, `pdfjs-dist`, `qrcode` | `frontend/package.json`, `frontend/src/app/*` |
| App data | Browser storage: `mano.jobs`, `mano.business`, `mano.clients`, `mano.session`, `mano.plan`, `mano.lang`; photos in IndexedDB `mano-files` | `frontend/src/lib/api.ts` (`read`/`write`), `lib/business.ts`, `lib/clients.ts`, `lib/auth.ts`, `lib/plan.ts`, `lib/attachments.ts` |
| AI routes (in the Next.js server) | Gemini: note/voice extraction (`/api/extract`), photo-of-note reading (`/api/read-note`), Ojo questions (`/api/ojo-suggest`), caption translation (`/api/translate`); ElevenLabs speech-to-text (`/api/voice`) | `frontend/src/app/api/*` |
| Demo relay | Lets a phone on the same Wi-Fi open/approve an estimate and see its photos; JSON files in the OS temp folder | `frontend/src/lib/demo-relay-server.ts`, `app/api/demo/*` |
| Backend | FastAPI + SQLAlchemy 2 + Postgres 17 (Docker). Tables created with `create_all` (no migrations yet; Alembic is installed but unused) | `backend/app/main.py`, `backend/app/db.py`, `docker-compose.yml` |
| Backend sync | The app copies jobs made with "Nuevo trabajo" to the backend in the background (create/update/status/delete) | `frontend/src/lib/backend.ts`, `queueBackendSync` in `lib/api.ts` |
| Ojo (Chris) | Deterministic status/validation rules, not merged into `dev`/`main` | branch `origin/chris-backend`: `backend/app/ojo.py` |
| Tests | Backend: 70 pytest tests (extraction, job service, read-note). Front end: none | `backend/tests/*` |

### Backend data model today (`backend/app/db.py`)

`businesses` → `customers` → `jobs` → (`job_line_items`, `quotes`, `actions`). Jobs carry a free-text `status`
(the canonical 10 states), `job_price`, `start_date`. There are **no** tables for invoices, payments, files,
users/memberships, notes, activity, or plans. `quotes` and `actions` exist but nothing writes to them yet.

## 2. Feature status

Legend: ✅ working · 🟡 partially working · 🎭 screens only / fake on purpose · ❌ not built · 🔧 needs refactoring

### Accounts, teams, organizations
| Feature | Status | Evidence / notes |
|---|---|---|
| Sign in / sign up (phone code, email code, Google, Apple), sign out, delete account | 🎭 | `lib/auth.ts` (any 6-digit code works), `app/entrar/page.tsx`, `components/auth-gate.tsx` |
| Route protection | 🎭 | Client-side only (`AuthGate`); the backend has no auth |
| Organizations / multi-tenant isolation | ❌ | Backend trusts a `business_id` query/body param; demo business is hard-coded (`business.py`, `DEMO_BUSINESS_ID`) |
| Team members, roles, permissions | ❌ | — |

### Clients / CRM
| Feature | Status | Evidence / notes |
|---|---|---|
| Client list (from jobs + saved clients) | ✅ (device only) | `app/clientes/page.tsx`, `lib/clients.ts` `groupClients` |
| Client page: contact, addresses, billed/paid/owed/overdue, jobs, new job | ✅ (device only) | `app/clientes/[id]/page.tsx` |
| Stable client id linking jobs | 🟡 | `client_id` set on jobs when a client page opens (`ensureSavedClient`); new jobs still match by name |
| Multiple service addresses (company clients) | 🟡 | Per-line `site` on line items (`LineItem.site`), shown grouped on documents; no "properties" entity |
| Saved-client recognition in a note ("Atlanta Homeiker" = ATL Homemaker) | ✅ | `lib/match.ts` |
| Private notes (Solo) | ✅ (device only) | `addClientNote` in `lib/clients.ts` |
| Communication history | ❌ | Sends happen in WhatsApp/SMS outside Mano; only `estimate_sent_at`/`invoice_sent_at` recorded |
| Leads, won/lost, source, repeat reminders | ❌ | Planned (CRM, Solo) |
| Backend customers | 🟡 | `customers` table + `GET /customers`; no create/update route, no email-on-create |

### Estimates
| Feature | Status | Evidence / notes |
|---|---|---|
| Create from voice / typed note / photo of a note (Spanish or English) | ✅ | `app/trabajos/nuevo/page.tsx`, `api/extract`, `api/voice`, `api/read-note` |
| Fill in by hand ("Prefiero llenarlo yo") | ✅ | `createBlankJob` in `lib/api.ts` |
| Line items, lump sum, quantity × unit price, per-site lines | ✅ | `LineItem`, `lineAmount`, `priceLine` in `lib/api.ts`; job editor in `app/trabajos/[id]/page.tsx` |
| Spanish ↔ English (owner reads Spanish, client gets English) | ✅ | `lib/translate.ts` + Gemini; `DocLangSwitch` |
| Ojo completeness check / missing info | ✅ | `lib/ojo.ts` `validate` |
| Professional estimate document + PDF + in-app PDF preview | ✅ | `components/document.tsx`, `document-pdf.tsx`, `client-preview.tsx` |
| Send (WhatsApp / SMS / copy / QR / PDF share) | ✅ via owner's phone | `components/share-estimate.tsx`; no server-sent email/SMS |
| Client approval link with typed-name signature | 🟡 | Works locally and on the same Wi-Fi (demo relay); not hosted |
| Optional / multiple-choice line items, packages | ❌ | — |
| Deposits | ❌ | — |
| Estimate revision after sending | ❌ | Price/work locked after sending; contact info editable |
| Estimate → job → invoice | ✅ (one record) | A job carries both `estimate_number` and `invoice_number`; "Facturar sin estimado" supported |

### Jobs & scheduling
| Feature | Status | Evidence / notes |
|---|---|---|
| Status flow (10 states) + labeled progress | ✅ | `STATUS_FLOW`, `nextStatus`, job page |
| Schedule a day | 🟡 | `scheduled_for` date only; no time, no calendar view |
| Calendar, crew assignment, recurring jobs, time tracking, checklists, job costing | ❌ | — |
| Job photos & files (captions translated, private toggle) | 🎭 | `components/job-files.tsx`, `lib/attachments.ts` (IndexedDB; demo relay for the link) |
| Cancel / reactivate with reason | ✅ | `cancelJob`, `reactivateJob` |

### Invoicing & payments
| Feature | Status | Evidence / notes |
|---|---|---|
| Invoice from a job (or without an estimate), numbering `INV-0001`, continue from Wave, edit number | ✅ (device only) | `prepareInvoice`, `setInvoiceNumber`, `nextNumber` in `lib/api.ts` |
| Due dates (Wave's terms), per-invoice date | ✅ | `DUE_OPTIONS` in `lib/business.ts` |
| Mark paid, method, partial payments, undo | ✅ (device only) | `addPayment`/`removePayment`, `PaymentSheet` |
| Overdue tracking + reminders (written by Mano, sent by the owner) | ✅ | `lib/ojo.ts` `prioritized`, `app/trabajos/[id]/seguimiento` |
| Online card/ACH payments | ❌ | — |
| Automatic reminders (sent by Mano) | ❌ | — |
| Receipts, refunds, recurring invoices, sales tax | ❌ | — |

### Customer experience
| Feature | Status | Notes |
|---|---|---|
| Client link (estimate → approve; invoice → amount due, paid) EN/ES | 🟡 | `app/e/[token]/page.tsx`; local/Wi-Fi only |
| Customer portal (all their documents), booking, notifications | ❌ | — |

### Business operations
| Feature | Status | Notes |
|---|---|---|
| Home dashboard (owed / overdue / paid this month / unanswered, next step, recent jobs) | ✅ | `app/inicio/page.tsx` |
| Reports, expenses, revenue over time | ❌ | — |
| Plans & upgrade (Free / Solo / Crew), feature gates | 🎭 | `lib/plan.ts` (fake checkout), `app/planes/page.tsx`, `components/upgrade-card.tsx` |
| Integrations (QuickBooks, Stripe, Google Calendar…) | ❌ | — |

### Platform
| Feature | Status | Notes |
|---|---|---|
| Spanish/English UI | ✅ | `lib/i18n.tsx` (one file, es + en) |
| Phone / tablet / desktop layouts | ✅ | Sidebar ≥1024px, tablet 768–1023, phone |
| Design system | ✅ | `components/ui.tsx`, `globals.css` tokens (forest/ivory/sage/peach/pro), flat cards |
| Hosting, domain, HTTPS | ❌ | Local + HTTPS proxy for phones on Wi-Fi |
| Database migrations | 🔧 | `create_all` only; Alembic unused |
| Front-end tests | ❌ | — |

## 3. Architectural problems and their impact

1. **Two sources of truth (biggest risk).** The browser is the real database; the backend gets a lossy copy of jobs
   (no invoices, payments, clients, photos). Impact: data lives and dies with one phone; no second device, no
   team, no hosting. *Fix:* move each entity to the backend behind the existing `lib/*` function names, one at a time
   (see the architecture proposal's migration strategy).
2. **No authentication or tenant isolation in the API.** Any caller can read or write any business by id. Must be
   solved before anything is hosted.
3. **One job record plays estimate, job and invoice.** Simple and works for one estimate → one invoice. It can't
   express a revised estimate, several invoices for one job (deposit + final), or an estimate that turns into two
   jobs. *Fix:* separate `estimates`, `invoices`, `payments` tables that point at the job, keeping the screens.
4. **Client identity by name.** Partly fixed with `client_id`; the backend `customers` table should become the owner.
5. **No migrations.** Schema changes will start now; Alembic must be adopted before the first new table.
6. **Server-side secrets and costs are unmetered.** AI routes run on our keys with no per-account limits: needed for
   plans and abuse protection once hosted.

## 4. What Mano does well (keep)

- **Spanish-first, English-out** is real and polished: the owner works in Spanish; the client gets professional English.
- **Fast capture:** voice, a photo of a paper note, typing, or filling it in by hand, all ending in the same editor.
- **Ojo's "one next step"** keeps the home screen simple for people who've never used CRM software.
- **Thoughtful money flow:** partial payments, overdue detection, reminders written for you, continue Wave numbering.
- **Calm, consistent design** across phone, tablet and desktop, with clear upgrade moments in their own color.
- **Swappable fakes:** login, plans and file storage are each one file with the real function names.

## 5. Recommended next milestone

**"Mano works across devices for one real business."** Hosted backend with real login, organizations, and the core
records (customers, jobs, estimates, invoices, payments, files) stored on the server, with the current screens reading
and writing through the API. Success = Edgar uses Mano on his phone, Abe sees the same data on his laptop, and an
English-speaking client approves an estimate from their own phone anywhere. Details and acceptance criteria:
[roadmap, Phase 0](MANO_IMPLEMENTATION_ROADMAP.md#phase-0--foundation-before-anything-else).
