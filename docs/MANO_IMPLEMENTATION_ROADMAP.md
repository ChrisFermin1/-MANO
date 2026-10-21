# Mano — Implementation Roadmap

*2026-10-20 · planning only · waits for Abe's approval before any item starts.*
Inputs: [audit](MANO_PRODUCT_AUDIT.md) · [Jobber comparison](MANO_JOBBER_COMPARISON.md) ·
[architecture](MANO_ARCHITECTURE_PROPOSAL.md) · [pricing](MANO_PRICING_STRATEGY.md)

Complexity: **S** days · **M** 1–2 weeks · **L** several weeks. No dates: the order is driven by dependencies.
Rule for every item: works in Spanish and English, on phone / tablet / desktop, by hand without AI, and is tested.

## The core loop everything must support

Request → **Client** → **Estimate** → **Approval** → **Scheduled job** → **Done** → **Invoice** → **Payment** →
**History / follow-up**, all on one client record.

Example: *"Necesito una cotización para John. Vamos a pintar tres cuartos por 850 dólares el sábado."*
Mano finds or creates John (asks to confirm if two Johns exist), drafts the English estimate ($850, 3 rooms), proposes
Saturday, waits for the owner to check it, sends it, and when John approves: job scheduled Saturday → invoice after
→ John pays online or the owner marks it paid → it's all on John's page. AI fills; the owner confirms every field.

---

## Phase 0 — Foundation (before anything else)

Why first: every P1 feature (hosting, approvals from anywhere, online payments, teams) needs the server to be the
source of truth. Without this, new features multiply the "only on this phone" problem.

| # | Item | Cx | Depends on | Acceptance criteria |
|---|---|---|---|---|
| 0.1 | Alembic + baseline migration | S | — | `alembic upgrade head` builds today's schema on an empty DB; `create_all` removed |
| 0.2 | Real auth (pick service: Clerk / Supabase Auth / own) + `users`, `memberships` | M | 0.1 | Phone-code and Google/Apple sign in; `lib/auth.ts` keeps its functions; API rejects requests without a session |
| 0.3 | Org scoping on every route | M | 0.2 | Org comes from the session; tenant-isolation tests pass (org A can't read org B by id) |
| 0.4 | Business settings on the server | S | 0.3 | Tu negocio reads/writes `/org`; autosave still works; numbering + due terms server-side |
| 0.5 | Customers + properties on the server | M | 0.3 | Client list/page from the API; jobs carry `customer_id`; name-typo fix keeps history |
| 0.6 | Jobs read from the server (not just copied) | M | 0.5 | Jobs list/page work on two devices; offline edits queue and retry |
| 0.7 | Estimates, invoices, payments tables + conversions | L | 0.6 | Numbers unique per org under concurrency; estimate→invoice in one transaction; partial payments sum correctly |
| 0.8 | Files in object storage | M | 0.3 | Photos/PDFs upload from phone, show on the client link and PDF, private ones never public |
| 0.9 | Hosted client link (replace demo relay) | M | 0.7, 0.8 | A client anywhere opens `mano.app/d/<token>`, approves; owner's phone updates within seconds |
| 0.10 | One-time import from this browser | S | 0.5–0.8 | First real login uploads local jobs/clients/business/files with a summary. *Front end ready:* `/importar` + `lib/import.ts`; needs `POST /import` |
| 0.11 | Hosting + monitoring + backups | M | 0.1 | Staging + production, daily DB backups, error alerts |

**Milestone 0 — "Works across devices for one real business."** Edgar on his phone, Abe on a laptop, same data;
a client approves from their own phone; nothing lives only in a browser.

## Phase 1 — Competitive MVP (Atlanta launch)

| # | Item | Cx | Depends on | Acceptance criteria |
|---|---|---|---|---|
| 1.1 | Online payments (Stripe Connect: card + ACH) on the client link | L | 0.9 | Client pays an invoice or part of it; payment recorded once (webhook idempotent); invoice → paid automatically; manual methods still work |
| 1.2 | Receipts | S | 1.1 | Client gets a receipt (link + email if present) for any recorded payment |
| 1.3 | Basic scheduling: day + time, week agenda | M | 0.6 | Accepted estimate → pick day/time; "Esta semana" view on phone and desktop |
| 1.4 | Email sending from Mano (estimates, invoices) | M | 0.9 | Owner can send by email from Mano (in addition to WhatsApp); activity shows "sent" and "opened" |
| 1.5 | Client history (activity) | S | 0.7 | Client page shows sent / opened / approved / paid / reminded with dates |
| 1.6 | Real plans & billing (Stripe Billing) + entitlements | M | 0.2 | `lib/plan.ts` uses Stripe; limits enforced server-side; downgrade keeps all history readable |
| 1.7 | Usage metering for AI/voice | S | 0.3 | Monthly counters per org; friendly limit message with upgrade card |
| 1.8 | Properties picker on new jobs | S | 0.5 | Company clients pick or add a property; per-line sites keep working |

**Milestone 1 — "A contractor can run their month on Mano"**: 10 Atlanta businesses invoicing and getting paid.

## Phase 2 — Daily operations

| # | Item | Cx | Depends on | Acceptance criteria |
|---|---|---|---|---|
| 2.1 | Automatic reminders (email free; SMS on Solo) | M | 1.4, worker | Owner turns on per business; overdue invoices get a polite reminder in the client's language; owner can pause per client |
| 2.2 | Deposits on estimates | M | 1.1 | Deposit % or $ on the estimate; approval asks to pay deposit; deposit invoice + final invoice |
| 2.3 | Estimate revisions | M | 0.7 | v2 replaces v1 on the same link; v1 kept read-only; approval applies to the exact version |
| 2.4 | Optional line items | M | 2.3 | Client ticks optional lines; total updates; owner sees what was chosen |
| 2.5 | Team members + roles (Equipo) | M | 0.2 | Owner invites by phone; office/crew permissions; crew sees only assigned jobs and no money totals |
| 2.6 | Assignments + shared schedule (Equipo) | M | 2.5, 1.3 | Assign visits; each member's phone shows their day |
| 2.7 | Recurring jobs & invoices (Solo) | M | 1.3 | Repeat rule creates future visits/invoices; edit one or all |
| 2.8 | Customer portal (one link, all their documents) | M | 0.9 | Client sees open estimates, invoices, receipts for that business |
| 2.9 | Appointment confirmations | S | 2.1 | "See you Saturday 9am" with reschedule-by-reply instructions |
| 2.10 | Saved price list ("Products & services") | S | 0.4 | Pick saved items while editing; voice can match them |

## Phase 3 — Business growth

| # | Item | Cx | Depends on | Notes |
|---|---|---|---|---|
| 3.1 | Leads / requests, won/lost, source | M | 0.5 | Solo (CRM); "¿Cómo te conoció?" |
| 3.2 | Online booking/request form | M | 3.1 | Shareable link creates a request |
| 3.3 | Expenses (receipt photo → amount, job) | M | 0.8, AI | Feeds job costing |
| 3.4 | Job costing ("Ganaste $1,100 en este trabajo") | M | 3.3, time | |
| 3.5 | Time tracking (Equipo) | M | 2.5 | |
| 3.6 | Reports + accountant export (CSV / QuickBooks) | M | 1.1 | |
| 3.7 | Repeat-work reminders ("¿le ofreces el exterior?") | S | 3.1 | Ojo suggestion, owner approves |
| 3.8 | Two-way SMS inbox | L | 2.1 | Only if customers ask; WhatsApp covers most of it |

## Phase 4 — Platform expansion

Industry templates beyond construction (cleaning, landscaping, auto repair), larger teams (several crews, locations),
integrations (QuickBooks sync, Google Calendar), native apps (Capacitor) once the web app is stable, more languages.

## Deliberately postponed

Website builder, marketing suite, AI phone receptionist, GPS/route optimization, inventory, point of sale, payroll,
chat inbox for every channel. Each is real Jobber value, but none blocks a 1–10 person Atlanta contractor from running
their business on Mano.

## Recommended next step

Approve **Phase 0** and pick the auth service. Start with 0.1–0.4 (migrations, auth, org scoping, business settings):
small, low-risk, and it unblocks everything else. Josh owns the backend items; the front end swaps `lib/auth.ts` and
`lib/business.ts` to the API without changing any screen.
