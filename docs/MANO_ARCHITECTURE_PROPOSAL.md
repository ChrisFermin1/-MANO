# Mano — Architecture Proposal

*2026-10-20 · proposal only: nothing here has been migrated or implemented. Builds on Josh's existing FastAPI + Postgres
backend (`backend/app/db.py`) instead of replacing it.*

## 1. Goal

One connected record per business, stored on the server:

```
Organization ─┬─ Members (users + role)
              ├─ Customers ── Properties (service locations)
              │     └─ Notes (Solo)
              ├─ Requests (leads)          ← optional start
              ├─ Jobs ──┬─ Estimates (versions) ── Estimate line items
              │         ├─ Visits / appointments (schedule, assignee)
              │         ├─ Invoices ── Invoice line items
              │         │     └─ Payments (manual or online)
              │         └─ Files (photos, PDFs)
              └─ Activity (who did what, when — every record above)
```

A customer is created once; every estimate, job, invoice and payment points at them. The screens already behave this
way on one device; this makes it true on the server.

## 2. Principles

- **Keep what works.** Josh's tables (`businesses`, `customers`, `jobs`, `job_line_items`) stay; we add to them.
  `businesses` becomes the organization (rename later, not now).
- **The front end's function names are the contract.** `lib/api.ts`, `lib/clients.ts`, `lib/auth.ts`, `lib/plan.ts`,
  `lib/attachments.ts` keep their signatures; their insides switch from browser storage to API calls one entity at a time.
- **Every row belongs to an organization** (`org_id`, today `business_id`) and every query filters by the caller's org.
- **Money is integers of cents** (or `Numeric(12,2)` as today, consistently), never floats.
- **Documents are immutable once sent.** A change makes a new version; the client sees what they were sent.

## 3. Proposed tables (new or changed)

| Table | Key columns | Notes |
|---|---|---|
| `users` | id, phone, email, name, locale, created_at | One person; can belong to several orgs |
| `memberships` | org_id, user_id, role (`owner`/`office`/`crew`), created_at | Roles drive permissions (Equipo) |
| `businesses` (= org) | + plan, plan_status, stripe_customer_id, next_invoice_number, invoice_due_days, pay_info, email, address, trades, hide_branding | Today's `mano.business` fields move here |
| `customers` | + org-scoped unique key on normalized name/phone, notes count, source, created_at | Exists; add create/update routes |
| `properties` | id, org_id, customer_id, address, label ("700 Wilson"), notes | Company clients with many houses |
| `customer_notes` | id, org_id, customer_id, author_id, text, created_at | Solo |
| `requests` | id, org_id, customer_id?, description, source, status (`new`/`won`/`lost`), created_at | Leads (later) |
| `jobs` | + property_id, client_id→customer_id required once created, service, service_es, cancel fields, scheduled_for/time, assignee_id | Exists; status stays the 10 canonical states |
| `estimates` | id, org_id, job_id, number (`EST-0001`), version, status (`draft`/`sent`/`approved`/`declined`/`superseded`), sent_at, approved_at, approved_by_name, approval_ip, public_token, total, deposit_amount, valid_until | Replaces the unused `quotes` table (migrate, then drop) |
| `estimate_line_items` | estimate_id, position, description, description_es, quantity, unit, unit_price, amount, site, optional, selected | Snapshot at send time |
| `invoices` | id, org_id, job_id, estimate_id?, number (unique per org), kind (`deposit`/`final`/`recurring`), status (`draft`/`sent`/`paid`/`void`), issued_at, sent_at, due_at, total, public_token | One job → many invoices |
| `invoice_line_items` | like estimate lines | Snapshot |
| `payments` | id, org_id, invoice_id, amount, method (`zelle`/`bank`/`check`/`cash`/`card`/`ach`/`online`), paid_on, check_number, provider, provider_payment_id (unique), status, refunded_amount, created_by | Idempotent on `provider_payment_id` |
| `visits` | id, org_id, job_id, starts_at, ends_at, assignee_id, status | Scheduling, recurring later |
| `files` | id, org_id, job_id?, customer_id?, kind, mime, size, storage_key, caption, caption_en, private, created_by | Object storage, not the DB |
| `activity` | id, org_id, actor (user / client / system), subject_type, subject_id, verb (`created`/`sent`/`viewed`/`approved`/`paid`/`reminded`…), data jsonb, created_at | Audit trail + client history + Ojo input |
| `usage` | org_id, period (YYYY-MM), ai_drafts, voice_minutes, sms_sent, storage_bytes | Plan limits |
| `idempotency_keys` | key, org_id, response, created_at | Safe retries for create/convert/pay |

## 4. Migrations (Alembic) — proposed order, not executed

0. **Adopt Alembic**: baseline migration matching today's `db.py`; stop using `create_all` in `main.py`.
1. `users`, `memberships`; add plan/billing/settings columns to `businesses`.
2. `customers` routes + `properties` + `customer_notes`; backfill `jobs.customer_id` by name per business.
3. `estimates` + `estimate_line_items`; move any `quotes` rows; keep `job_line_items` as the job's working draft.
4. `invoices` + `invoice_line_items` + `payments`.
5. `files` (+ object storage bucket), `activity`, `usage`, `idempotency_keys`.
6. `visits` (then recurring rules), `requests`.

Each migration is additive (new tables/nullable columns) so the running app keeps working; drops happen only after the
front end stopped using the old shape.

## 5. API shape (REST, FastAPI)

All routes require a session and resolve the org from it (no `business_id` in query strings).

```
POST /auth/code · POST /auth/verify · POST /auth/oauth/{google|apple} · POST /auth/logout · DELETE /me
GET/PATCH /org  (business settings, numbering, plan)
GET/POST /customers · GET/PATCH /customers/{id} · POST /customers/{id}/notes · GET /customers/{id}/activity
GET/POST /customers/{id}/properties
GET/POST /jobs · GET/PATCH/DELETE /jobs/{id} · POST /jobs/{id}/status
POST /jobs/{id}/estimates            → creates draft v1 (or next version)
POST /estimates/{id}/send            → assigns EST number, public token, activity 'sent'
POST /jobs/{id}/invoices             → from approved estimate or directly; deposit|final
POST /invoices/{id}/send · POST /invoices/{id}/payments · DELETE /payments/{id}
POST /files (presigned upload) · PATCH/DELETE /files/{id}
GET  /public/d/{token}               → client link (estimate or invoice, EN/ES), no auth
POST /public/d/{token}/approve       → typed name, IP, timestamp
POST /public/d/{token}/pay           → Stripe Checkout / PaymentIntent
POST /webhooks/stripe                → payment succeeded/refunded, subscription changes
AI (moved from Next.js): POST /ai/extract · /ai/read-note · /ai/voice · /ai/translate · /ai/ojo-suggest (metered)
```

## 6. Service boundaries

- **Core API (FastAPI):** org, customers, jobs, estimates, invoices, payments, files metadata, activity.
- **AI service (same app, separate module):** Gemini/ElevenLabs calls, usage metering, prompt versions.
- **Ojo (Chris):** pure rules module (`ojo.py` on `chris-backend`) called by the core API with server-verified evidence;
  returns checks/alerts/next step. Merge it as a library, not a separate server.
- **Worker:** scheduled tasks (overdue detection, reminders, recurring jobs/invoices, usage resets). Start with a
  cron-triggered endpoint or a small queue (e.g. RQ/Celery or a managed scheduler); no reminders run inside requests.
- **Messaging:** email first (transactional provider), SMS later (Twilio/Telnyx with A2P 10DLC registration).
  WhatsApp stays owner-sent from their phone.
- **Payments:** Stripe Connect (each business is a connected account; Mano never holds funds).
- **Object storage:** S3-compatible bucket, private by default, presigned URLs; client-visible files served through
  the public document endpoint.

## 7. Correctness & security

- **Multi-tenant isolation:** every query filtered by `org_id` from the session (a dependency in FastAPI); add a test
  that a token for org A can never read org B. Consider Postgres row-level security as a second guard later.
- **Permissions:** owner (everything), office (no plan/billing, no delete account), crew (only assigned jobs, no money
  totals). Enforced in the API, mirrored in the UI.
- **Public document links:** 128-bit random tokens, not ids; scoped to one document; revocable; rate-limited;
  `noindex`. Approval stores typed name, timestamp, IP, user agent, and the exact document version.
- **Transaction-safe conversions:** estimate → job and job → invoice run in one DB transaction; document numbers come
  from a per-org counter row locked `FOR UPDATE` (no duplicate `INV-0190`, respects "continue from Wave").
- **Idempotent payments:** Stripe webhook events stored by event id; payments unique on `provider_payment_id`;
  client "pay" requests carry an idempotency key.
- **Audit trail:** `activity` row for every state change (also feeds client history and Ojo).
- **Secrets & costs:** AI keys only on the server; per-org rate limits and monthly usage counters.
- **Data rights:** downgrade never deletes or hides history (read-only where a paid feature lapses); export to
  CSV/PDF; full delete on "Borrar mi cuenta" (DB rows + files + Stripe customer).

## 8. Migrating from the browser (safe strategy)

1. **Backend first, behind the same function names.** Implement API + switch one `lib/*` module at a time
   (business → customers → jobs → estimates/invoices → payments → files), each behind a feature flag.
2. **One-time import:** on first real login, the app uploads what's in this browser (`mano.jobs`, `mano.clients`,
   `mano.business`, IndexedDB files) to an import endpoint, with a summary screen ("Subimos 23 trabajos y 9 clientes").
3. **Read from the server, keep a local cache** for offline/slow signal; writes queue and retry (the pattern
   `queueBackendSync` already uses).
4. **Retire** `demo-relay-server.ts`, `RelaySync`, and browser storage once every module reads from the API.

## 9. Testing requirements

- Backend: unit tests per service (numbering, conversions, payments, permissions), API tests per route,
  a tenant-isolation test suite, Stripe webhook replay tests.
- Front end: component tests for the money math (`lineAmount`, `jobTotal`, `balanceDue`, `invoiceState`) and
  Playwright flows for the core loop (sign in → job → estimate → approve on a second browser → invoice → pay).
- Before each release: phone (390 and small iPhone), tablet, desktop; Spanish and English.

## 10. Technical risks

| Risk | Impact | Mitigation |
|---|---|---|
| Moving data off the browser breaks working screens | High | Same function names, one module at a time, feature flags, import step |
| Stripe Connect onboarding friction for contractors without an EIN/bank habits | Medium | Keep manual payment methods first-class; Stripe Express onboarding in Spanish |
| SMS deliverability (10DLC) and cost | Medium | Email first; owner-sent WhatsApp; SMS only on paid plans |
| AI cost spikes / abuse once public | Medium | Metering + limits per plan; cache translations |
| App Store rules for selling subscriptions | Medium | Sell on the web; follow Apple/Google rules if native apps ship |
| Small team, many surfaces | High | Phase 0 before any new Phase 1–2 feature |
