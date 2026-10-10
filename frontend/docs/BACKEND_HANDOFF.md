# Mano — Backend Handoff

Everything the frontend already does, so the FastAPI backend can match it.
The frontend currently runs on a **fake API stored in the browser** (`localStorage`). Every screen talks to it only through **`src/lib/api.ts`**, so going live = replace each function body in that file with a `fetch()` to FastAPI. **No screen code needs to change** as long as responses keep the shapes below.

| Frontend file | What it fakes | Backend owner |
|---|---|---|
| `src/lib/api.ts` | REST API + database | API / DB |
| `src/lib/mano.ts` | Mano AI (extraction + messages) | Mano / Gemini |
| `src/lib/ojo.ts` | Ojo (validation, alerts, next action) | Ojo / workflow |
| `src/lib/business.ts` | Business profile | API / DB |
| `src/lib/checklists.ts` | Ojo's per-trade "forgot to charge?" checklists | Ojo / workflow |

> **No accounts / auth.** Hackathon decision: one business, `business_id = 1`. No login, no passwords.

---

## 1. Data model

### Business
```ts
{
  ownerName: string            // "Carlos"
  businessName: string         // "Carlos Painting" — printed on estimates/invoices
  phone: string                // optional; customer page uses it for Call / Text
  trades: TradeId[]            // from onboarding step 1 → picks Ojo's checklists
  otherTrade?: { name: string; unit: PriceUnit } | null   // when "Otro" picked, e.g. { "Techos", "project" }
  ojoIgnore?: string[]         // checklist keys Carlos "always includes" → Ojo stops asking
}
TradeId   = "painting" | "drywall" | "flooring" | "bathKitchen" | "remodel" | "other"
PriceUnit = "hour" | "project" | "sqft" | "room"
```
- `"other"` is **exclusive** in the UI (picking it clears the other trades and vice versa).
- **No price fields anywhere in setup.** Mano never suggests prices: Carlos says them (Gemini extracts) or types them. Ojo flags any missing price.

### Job
```ts
{
  id: number
  customer_name: string | null
  customer_phone?: string | null  // OPTIONAL — never required by Ojo; enables one-tap WhatsApp / SMS
  address: string | null
  service: string                 // "Interior Painting" (English: estimates, backend)
  service_es?: string | null      // OPTIONAL — "Pintura interior": what Carlos sees. Returned by Gemini (/api/extract);
                                  // the 6 built-in job types have fixed Spanish names in services.ts. Job LISTS show the
                                  // address instead (one job can mix several kinds of work); the job page shows this.
  description: string             // what Carlos said/typed (raw transcript)
  line_items: { id: string;
                description: string;            // ENGLISH — what the customer sees on estimate/invoice
                description_es?: string | null; // Carlos's language — what he reads & edits in the app
                translation_pending?: boolean;  // Spanish couldn't be translated yet → Ojo blocks sending
                amount: number | null;
                price_source?: "spoken" | "manual" | null }[]
  status: JobStatus
  created_at: ISODate
  updated_at: ISODate             // Ojo uses this for "no reply in N days"

  // Documents
  estimate_number: number | null  // shown as EST-0001
  estimate_sent_at: ISODate | null
  invoice_number: number | null   // shown as INV-0001
  invoice_sent_at: ISODate | null
  invoice_due_at: ISODate | null  // sent_at + 15 days
  paid_at: ISODate | null

  // Customer link
  public_token: string | null     // customer opens /e/<public_token>
  approved_at: ISODate | null
  approved_by: string | null      // name the homeowner typed as signature

  // Cancellation
  cancelled_at: ISODate | null
  cancel_reason: "declined" | "no_response" | "other" | null
  cancelled_from: JobStatus | null   // where to go back on "reactivate"

  // Ojo
  ojo_dismissed?: string[]        // checklist keys Carlos marked "no aplica" on THIS job
  ojo_skipped?: boolean           // ✕ on "Ojo pregunta": skip all questions for THIS job (reversible with "Ver")
}
```
- `price_source`: `spoken` = Carlos said it · `manual` = typed on the job page.
- **Two languages per line.** Carlos is in the US and most customers speak English, so **estimates & invoices are always English** (`description`), while Carlos always reads/edits in Spanish (`description_es`). When he edits a line in Spanish, the app translates it to English; if it can't, `translation_pending = true` and Ojo adds **"traducción"** to what's missing (he can type the English himself). Every line shows a small `EN …` preview with "Cambiar".

---

## 2. Endpoints

Each row = one function in `src/lib/api.ts`.

| Function | Endpoint | Body | Returns | Notes |
|---|---|---|---|---|
| `getJobs()` | `GET /jobs` | — | `Job[]` sorted by `updated_at` desc | |
| `getJob(id)` | `GET /jobs/:id` | — | `Job` / 404 | |
| `createJob(text)` | `POST /jobs` | `{ description }` | `Job` | Runs **Mano** (extract) then **Ojo** (validate) → status `NEEDS_INFORMATION` or `READY_FOR_QUOTE` |
| `updateJob(id, patch)` | `PATCH /jobs/:id` | partial Job | `Job` | While still a draft, **re-run Ojo** and set status automatically (see rules) |
| `setStatus(id, s)` | `POST /jobs/:id/status` | `{ status }` | `Job` | Manual steps: ACCEPTED → SCHEDULED → IN_PROGRESS → COMPLETED |
| `sendEstimate(id)` | `POST /jobs/:id/estimate/send` | — | `Job` | Assigns `estimate_number`, `estimate_sent_at`, `public_token`; status → `QUOTE_SENT` |
| `sendInvoice(id)` | `POST /jobs/:id/invoice/send` | — | `Job` | From `COMPLETED`, **or directly from a complete draft without an estimate** (§3 rule 6). Assigns `invoice_number`, `invoice_sent_at`, `invoice_due_at` (+15d); status → `PAYMENT_PENDING` |
| `markPaid(id)` | `POST /jobs/:id/invoice/paid` | — | `Job` | status → `PAID`, sets `paid_at` |
| `sendMessage(id)` | `POST /jobs/:id/actions` | `{ type, message }` | `Job` | Follow-up / payment reminder approved by Carlos. Mock only bumps `updated_at` (resets Ojo's "no reply" clock). Real sending (SMS/email) = stretch |
| `deleteJob(id)` | `DELETE /jobs/:id` | — | 204 | **Drafts only** (see rules) |
| `toEnglish(es)` *(src/lib/translate.ts)* | `POST /mano/translate` | `{ text, from: "es", to: "en" }` | `{ text: string \| null }` | Gemini, short customer-facing contractor English. Used for **line items AND full follow-up / reminder messages** (Carlos edits messages in Spanish; customer gets English). Return `null` if unsure — never guess. Frontend calls it through `translateToEnglish()` in `src/lib/translate.ts` (mock only knows contractor vocabulary, so edited messages show "pendiente" until this exists) |
| `cancelJob(id, reason)` | `POST /jobs/:id/cancel` | `{ reason }` | `Job` | Saves `cancelled_from`; status → `CANCELLED` |
| `reactivateJob(id)` | `POST /jobs/:id/reactivate` | — | `Job` | status → `cancelled_from` (fallback `QUOTE_SENT`); clears cancel fields |
| `getJobByToken(t)` | `GET /public/estimates/:token` | — | public Job view / 404 | **No auth.** Customer page |
| `approveEstimate(t, name)` | `POST /public/estimates/:token/approve` | `{ name }` | public Job view | **No auth.** Only when status is `QUOTE_SENT` → `ACCEPTED`, sets `approved_at`, `approved_by` |
| `resetJobs({demo})` | `POST /dev/reset` | `{ demo: bool }` | — | Demo helper: onboarding → empty; "Ya tengo cuenta" → sample jobs. Can be dev-only |
| `saveBusiness()` / `loadBusiness()` | `PUT /business` / `GET /business` | Business | Business | Business id 1 (incl. `ojoIgnore`) |

---

## 3. Business rules the server must enforce

The UI hides buttons, but **the backend must reject** invalid requests too.

1. **Auto-status while drafting.** On `POST /jobs` and on `PATCH` while the job is still a draft (`NEW`, `NEEDS_INFORMATION`, `READY_FOR_QUOTE`): status = `NEEDS_INFORMATION` if Ojo finds anything missing, else `READY_FOR_QUOTE`.
2. **Can't send an estimate with missing info** (Ojo `validate()` must return nothing).
3. **Numbering:** `estimate_number` / `invoice_number` are assigned **only on send**, never on drafts → no gaps. Sequential **per business** (Postgres sequence or `MAX()+1` in a transaction). Re-sending keeps the same number. Display format `EST-0001` / `INV-0001` is done in the frontend.
4. **Delete** only if: no `estimate_number` AND status is `NEW` / `NEEDS_INFORMATION` / `READY_FOR_QUOTE` (`canDelete` in `api.ts`).
5. **Cancel** only if: has `estimate_number`, has **no** `invoice_number`, status not `CANCELLED` / `PAID` (`canCancel`). Invoiced jobs are financial records — never delete/cancel.
6. **Invoice** from `COMPLETED`, **or "Facturar sin estimado"**: directly from a complete draft (`NEW`/`NEEDS_INFORMATION`/`READY_FOR_QUOTE`, no `estimate_number`, Ojo finds nothing missing) → `PAYMENT_PENDING`, skipping the estimate states. Never twice (`invoice_number` already set → reject). Due = sent + **15 days**. ⚠️ Team decision: this skips QUOTE_SENT…COMPLETED in `docs/architecture.md`; the backend state rules must allow `READY_FOR_QUOTE → PAYMENT_PENDING`.
7. **Invoice state** (computed, not stored): `paid` if `paid_at`; `overdue` if `invoice_due_at < now`; else `unpaid`.
8. **Public approve** only from `QUOTE_SENT`. Cancelled / already-approved → show message, don't change anything.

---

## 4. Mano (AI) contract — Gemini

### Extraction (`interpret()` in `mano.ts`)
- **Input:** `description` (text, or audio if we do the audio-to-Gemini option), business `trades`, `otherTrade`, language.
- **Output (current shape the UI needs):**
  ```ts
  { customer_name, address, service, service_es, line_items: [{ id, description, description_es, amount }] }
  ```
- Return **both** `description` (customer-facing English, e.g. "Interior painting – kitchen, 2 coats") and `description_es` (the same line in Carlos's Spanish, e.g. "Pintura interior – cocina, 2 manos") for every line. Ambiguous words need context: for a roofer "techos" = roofs, for a painter = ceilings.
- **Prices:** Gemini returns **only prices Carlos said** (`price_source: "spoken"`). Everything else → `null` (Ojo flags "falta precio"). **Never invent or suggest prices** — product decision: job sizes vary too much (a 100 vs 600 sq ft patio) for past prices to be safe defaults. Do any math in Python, not in the LLM.
- Put in the prompt: his **trades** (helps vocabulary: "mano" = coat, "resanar" = patch, "tablaroca" = drywall; and ambiguity: for a painter "arreglar el baño" = paint the bathroom).
- Include **`otherTrade`** in the prompt: *"Carlos also does: Techos, usually $2,500 per project."*
- Current mock is keyword-based and misses a lot (nicknames, locations without a street number, spoken prices) — that's expected; Gemini replaces it.

### Recommended extra fields (UI not wired yet — tell frontend when added)
| Field | Why |
|---|---|
| `job_title` | Carlos's nickname for the job ("la casa azul") |
| `location_area` | City / neighborhood when no street address ("Katy") |
| `line_items[].price_source` | Now part of LineItem (§1). Gemini sets `"spoken"` only for prices Carlos said |
| `line_items[].evidence` | Words the item came from (debugging, anti-hallucination) |
| `transcript` | Clean transcript if audio goes straight to Gemini |
| `unclear: string[]` | Short Spanish questions → Ojo can ask Carlos |
| `customer_phone` | If Carlos says it ("su número es 832-555-1234"). Optional; the mock already picks US-style numbers |

See the Gemini plan we discussed: structured output (JSON schema), Flash model, temperature ~0.1, model name in env var `GEMINI_MODEL`, API key **server-side only** (`GEMINI_API_KEY`).

### Messages (`followUpMessage()` in `mano.ts`)
- **Spanish-first:** Carlos reads and edits the Spanish (`es`); the English (`en`) is shown as a read-only preview of what the customer receives. If he edits, the English is regenerated via `POST /mano/translate`. Share-link text sent to customers is always English (Spanish meaning shown to Carlos).
- Returns `{ en, es }`: English message to the customer + Spanish meaning for Carlos.
- Two kinds: **quote follow-up** (status `QUOTE_SENT`) and **payment reminder** (`PAYMENT_PENDING` / `COMPLETED`).
- **Sending:** if the job has `customer_phone`, Carlos sends from his own phone via one-tap links (`https://wa.me/<digits>?text=…`, `sms:+<digits>?&body=…`, US numbers get `+1`), and the app records it as sent. The backend doesn't send messages for the MVP.
- Carlos can edit the English text before approving.

---

## 5. Ojo contract (`ojo.ts`)

### `validate(job)` → missing keys
`"customer"` (no name), `"address"`, `"items"` (no line items), `"price"` (any item with `amount = null`).

### `suggestions(job, business)` → "you forgot to charge for…"
**Paso 1 (tipo de trabajo) decides which checklists Ojo watches.** Full lists in `src/lib/checklists.ts`:

| Trade | Checklist |
|---|---|
| Pintura | primer, techos, trim y puertas, segunda mano, resanar paredes, mover muebles, pintura y materiales |
| Drywall | textura, primer sobre parches, pintar después, limpieza y escombro |
| Pisos | quitar piso viejo, nivelar, zócalos, transiciones, mover muebles |
| Baños y cocinas | demolición, plomería, permisos, sellar, accesorios |
| Remodelación | permisos, demolición, limpieza y escombro, materiales, imprevistos |

Logic:
1. Trades = Carlos's trades (all if he skipped Paso 1; `other` has no checklist).
2. Keep only trades the job actually involves (`detect` regex on what he said + line items). Bath/kitchen uses specific words only, so "pintar la cocina" never triggers plumbing.
3. Drop items already mentioned (said or on the estimate), in `business.ojoIgnore` ("Ya lo incluyo siempre"), or in `job.ojo_dismissed` ("No aplica").
4. UI shows ONE question at a time. **+ Agregar** adds the line with an empty price (Ojo then flags it). Items silenced with "Ya lo incluyo siempre" show as small chips on the job page; tapping one (↺) removes it from `ojoIgnore`.

### `alerts(jobs)` → what needs attention
| kind | Condition |
|---|---|
| `missing` | status `NEW` / `NEEDS_INFORMATION` |
| `ready` | status `READY_FOR_QUOTE` |
| `to_schedule` | status `ACCEPTED` (shown as **good news** if `approved_by` is set) |
| `no_response` | status `QUOTE_SENT` and `updated_at` ≥ **2 days** ago |
| `payment` | status `PAYMENT_PENDING` (shown as overdue if past `invoice_due_at`) |

`CANCELLED` and `PAID` jobs never produce alerts.

### `nextAction(jobs)` → the ONE thing to do now
Priority: **`to_schedule` → `no_response` → `payment` → `ready` → `missing`**; within a kind, the oldest `updated_at` first.
The dashboard shows this job as the big card and **excludes it from Ojo's list** (no duplicates).

---

## 6. Customer link (homeowner — no app, no account)

- On `sendEstimate`, generate `public_token`: **long, random, unguessable** (e.g. `secrets.token_urlsafe(16)`). The mock's short tokens are for demo only.
- Frontend page: `/e/<token>` — shows the English estimate, an EN/ES toggle, "type your name to approve", Call/Text buttons (uses `business.phone`).
- `GET /public/estimates/:token` must return **only safe fields**: business name + phone, customer name, address, line items, estimate number/date, status, approved_by/at. **Never** other jobs, internal notes, or the raw transcript.
- Consider rate-limiting the public endpoints.
- Sharing is done on Carlos's phone (native share sheet → WhatsApp/SMS, copy link, QR). The backend doesn't send anything for the MVP.
- Once deployed, the link uses the real domain automatically (`window.location.origin`).

---

## 6b. Dashboard money & recent jobs

Computed in the frontend from `GET /jobs` (`moneySummary()` and `jobBadge()` in `src/lib/api.ts`) — no extra endpoint needed. If the job list gets big, add `GET /dashboard` returning the same numbers.
- **Por cobrar** = sum of jobs with an `invoice_number`, not `paid_at`, not `CANCELLED`.
- **Vencido** = the part of that past `invoice_due_at`.
- **Pagado este mes** = invoices with `paid_at` in the current calendar month.
- Card is hidden until the business has sent at least one invoice.
- **Trabajos recientes** = 3 most recently updated non-cancelled jobs with a short, **neutral** status: Sin enviar, Enviado, Aceptado, Agendado, En progreso, Terminado, Facturado, Pagado. Warnings (missing info, overdue, no reply) are **only** shown by Ojo — the list never repeats them.

## 6c. DEMO-ONLY relay (delete when the backend is live)

So a phone can scan the QR and approve before the backend exists, the Next.js dev server has a tiny relay:
`POST /api/demo/estimates`, `GET /api/demo/estimates/:token`, `POST /api/demo/estimates/:token/approve`, `GET /api/demo/origin`
(files: `src/app/api/demo/**`, `src/lib/demo-relay-server.ts`, `src/lib/relay.ts`, `src/components/relay-sync.tsx`).
It stores to a temp file on the Mac, has **no auth**, and is meant for local Wi-Fi demos only. The real
`GET/POST /public/estimates/:token` (§6) replaces it — same idea, same shapes.

## 7. Live updates

- Today the "¡Maria aprobó el estimado!" pop-up and the live-refreshing pages only work **between tabs in one browser** (mock).
- **Needed:** frontend will poll `GET /jobs` every ~10s while Carlos has the app open, and compare statuses. No backend work beyond fast `GET /jobs` — unless you prefer a websocket / SSE.
- Push notifications / SMS to Carlos when the app is closed = stretch, not planned.

---

## 8. Demo seed data ("Ya tengo cuenta")

| id | Customer | Status | Docs | Purpose in demo |
|---|---|---|---|---|
| 1 | Maria Rodriguez | `QUOTE_SENT` (3 days) | EST-0003, token `maria-x7k2p9` | Follow-up + customer approval demo |
| 2 | Juan Pérez | `NEEDS_INFORMATION` | — | Ojo "falta dirección, precio"; delete demo |
| 3 | Ana García | `SCHEDULED` | EST-0002 (approved) | Workflow → invoice demo |
| 4 | Pedro Sánchez | `PAYMENT_PENDING` | EST-0001, INV-0001 **overdue** | Payment tracking demo |

Exact values: `seed()` in `src/lib/api.ts`.

---

## 9. Not built yet / open questions

- [ ] Real Gemini extraction (Person 3) + extra fields from §4
- [ ] Audio upload endpoint if we send audio straight to Gemini (`multipart/form-data`)
- [ ] Phone mic needs **HTTPS** → deploy (Vercel for frontend, Render/Railway for FastAPI) or use a tunnel for testing
- [ ] CORS: allow the Vercel domain (and `http://localhost:3002` for dev)
- [ ] Hours for per-hour pricing (Ojo should ask "¿cuántas horas?")
- [ ] Voiding invoices (real-world need, not MVP)
- [ ] Actually sending SMS / email / PDF (stretch)
- [ ] Cents in money (currently whole dollars)

---

## 10. If we have time (stretch — ranked by demo value)

Core MVP first. Only start these once §11's checklist passes.

| # | Feature | Status today | What's needed | Who | Effort |
|---|---|---|---|---|---|
| 1 | **Live approval pop-up across devices** (judge scans QR, approves on their phone, Carlos's screen pops "¡Maria aprobó!") | Pop-up built, but only works between tabs in one browser | Real backend + frontend polls `GET /jobs` every ~10s and compares statuses (same logic as `approval-toast.tsx`) | Backend + frontend | ~30 min after API is live |
| 2 | **Ojo asks, Mano updates** — after extraction, Ojo asks the missing info by voice ("¿Cuánto cobras por la cocina?"), Carlos answers, Gemini patches the job | Not built | Gemini "patch" call: `{current_job, question, answer}` → updated job; small Q&A screen | Mano + frontend | 3–4 h |
| 3 | **Audio straight to Gemini** (better Spanglish, names, numbers) | Browser speech-to-text only | `POST /mano/interpret` accepting audio (`multipart/form-data`); frontend records with MediaRecorder | Mano + frontend | 3–4 h |
| 4 | **Customer invoice link** — same as estimate link, homeowner sees the invoice (+ "Pay" later) | Not built | `public_token` reuse, `/f/<token>` page | Frontend (+ public GET) | 1–2 h |
| 5 | **Notify Carlos when the app is closed** (push notification or SMS) | Not built | Web Push (PWA) or Twilio SMS on approval / payment | Backend | Several hours |
| 6 | Actually send SMS / email / PDF of estimates & invoices | Share sheet only (WhatsApp/SMS from Carlos's phone) | Twilio / email provider / PDF render | Backend | Several hours |
| 7 | Void invoices | Invoiced jobs can't be cancelled | `POST /jobs/:id/invoice/void` + "Anulada" state | Backend + frontend | 1 h |
| 8 | Hours for per-hour pricing | Not handled | Ojo asks "¿cuántas horas?" (fits with #2) | Ojo | 1 h |
| 9 | Checklist for "Otro" trades | No checklist for custom trades | Gemini generates a short "commonly forgotten" list for e.g. "Techos" once, store per business | Mano | 1–2 h |
| 10 | Rate-based price help (revisit after the hackathon) | Removed on purpose — no price suggestions or "too low" warnings | Only if done by rate: Mano extracts quantity + unit ("400 pies cuadrados"), store $/unit, compare only same unit with ≥3 past jobs; otherwise stay silent | Mano + Ojo | 2–3 h |

---

## 11. Integration checklist

1. `GET /health` works from the frontend (CORS ok).
2. `GET /jobs`, `GET /jobs/:id` return the Job shape above.
3. `POST /jobs` with Mano + Ojo → status set correctly.
4. `PATCH /jobs/:id` re-validates drafts.
5. Estimate send → number + token; public GET/approve work from another device.
6. Invoice send / paid; overdue computed.
7. Delete / cancel / reactivate rules enforced server-side.
8. Tell frontend → we swap `api.ts` to `fetch()` and turn on polling.
