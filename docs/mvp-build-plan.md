# Mano MVP — frontend build plan (Abe's branch)

Work happens on the branch `abe/experiments`, never directly on `dev`. Finished work reaches the team
through a pull request into `dev`. Progress for the whole team is also tracked in the "Feature List" doc
(Progress table): https://claude.ai/code/artifact/ef262148-2741-4fb9-a9e9-40490ced7ab0

## Rules (for any person or AI tool working on this)

1. Read `AGENTS.md` first. Don't invent job states, database fields or API contracts on your own.
2. One task at a time, in the order below. For each task: build it → test it in the browser at phone
   size (390×844) in Spanish and English → `npx tsc --noEmit` and `npx eslint <changed files>` pass →
   commit on `abe/experiments` with a plain-English message → add a row to the Progress table in the
   Feature List doc (status, branch, what Josh and Chris need to do).
3. Don't push or merge into `dev` unless Abe says so.
4. Keep the app's look: same components (`src/components/ui.tsx`), glass cards, and every new text in both
   languages in `src/lib/i18n.tsx` (Spanish first).
5. Anything that needs a new field in Josh's database: build it in the app only, and write in the
   Progress table exactly what Josh would need to add. Agree with Josh before he builds it.
6. Never commit `.env*` files or API keys.

## Running it

```bash
cd frontend
npm ci                      # first time only
npm run dev -- -p 3002      # http://localhost:3002
```

Keys go in `frontend/.env.local` (git-ignored): `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`.
App data lives in the browser (localStorage). To start fresh, clear site data. "Ya tengo cuenta" on the
Welcome screen loads sample jobs. The backend (port 8000) doesn't need to run; the app shows
"Sin conexión con la base de datos" and keeps working.

## Order

| # | Task | Status | Commit |
|---|------|--------|--------|
| 0 | iPhone status bar fix | ✅ Done | `0c63bbc` |
| 1 | Prices from scanned notes + totals warning | ✅ Done | `3ccdd84` |
| 2 | "Sent" only when it's sent | ✅ Done | `9b09722` |
| 3 | Ojo uses the job's type first | ✅ Done | `2e06426` |
| 4 | Home screen: one next step | ✅ Done | `4c24fb1` |
| 5 | Invoice and estimate views: no dead end | ✅ Done | `675dccc` |
| 6 | Create from every list ("+") | ✅ Done | `a8793de` |
| 7 | Search | ✅ Done | `3009856` |
| 8 | Mark as paid: method and partial payments | ✅ Done (needs Josh later) | `67d2a8a` |
| 9 | Edit contact details after sending | ✅ Done | `8476b3c` |
| 10 | Voice hears only Carlos (no TV, right language) | ⏭ Next | |

Update this table (status + commit) after each task.

## Next tasks in detail

### 5. Invoice and estimate views: no dead end
- **Problem:** after an estimate or invoice is sent, "View estimate/invoice" opens a page with only the
  document and a back arrow. Carlos can't tell that sending again, mark as paid and follow-up live on the
  job page.
- **Build:** in `src/app/trabajos/[id]/estimado/page.tsx` and `src/app/trabajos/[id]/factura/page.tsx`,
  when the page is view-only (no "Preparar para enviar" button showing), add a button at the bottom:
  **"Volver al trabajo"** / "Back to the job" → `/trabajos/[id]`.
- "Descargar PDF": done later (see Extra changes).
- **Done when:** a sent estimate and a sent invoice both show the button, it goes to the job page, and the
  draft/prepare screens are unchanged.

### 6. Create from every list ("+")
- **Build:** a "+" button on `/documentos` (Estimates and Invoices tabs) and `/clientes`.
  - Estimates tab → `/trabajos/nuevo` with Estimate selected. Invoices tab → `/trabajos/nuevo` with
    Invoice selected. `src/app/trabajos/nuevo/page.tsx` keeps this choice in
    `const [docKind, setDocKind]`; read a query param like `?doc=invoice` to preselect it.
  - On a client's card in `/clientes`: "Nuevo estimado para Maria" → `/trabajos/nuevo` with her name
    (and address/phone) already filled in.
- **Decided (Abe): yes, standalone clients.** Saved on the phone (`mano.clients`, see `src/lib/clients.ts`)
  until Josh's backend can create a customer without a job (and stores an email).
- **Done when:** each "+" opens New job set up correctly, in both languages.

### 7. Search
- **Build:** a search box on the jobs list (`/trabajos`) that filters as you type by client name,
  address, job type, and estimate/invoice number (e.g. "INV-0001"). Optional: the same on `/clientes`
  and `/documentos`.
- **Done when:** typing part of a name, street or number finds the job, accents ignored ("perez" finds
  "Pérez"), and clearing the box shows everything again.

### 8. Mark as paid: method and partial payments
- **Build:** "Marcar como pagado" opens a small sheet (use `Sheet` in `src/components/ui.tsx`): method
  (Zelle · Banco · Cheque · Efectivo · Tarjeta), date (today by default), amount (full total by default,
  can be less = partial payment), optional check number. The job is paid only when payments add up to the
  total; until then show "Pagado $2,000 de $5,400".
- Store it on the job in the app (for example a list of payments). Don't change Josh's backend.
- **Josh later:** a payments table or fields (amount, method, date, check number). Write the exact
  proposal in the Progress table.
- **Done when:** a full payment marks it paid; a partial payment shows the balance and keeps it unpaid;
  money owed and "paid this month" on the home screen and Documents page stay correct.
- **Built:** `Job.payments` (`{id, amount, method, date, check_number}`), `addPayment`, `paidSoFar`, `balanceDue`
  in `src/lib/api.ts`. Older jobs with `paid_at` and no payments count as fully paid. The invoice, the
  customer link, the share message and the reminder ask for the balance.
- **Josh proposal:** table `payments` (id, job_id → jobs, amount numeric(10,2), method text
  `zelle|bank|check|cash|card`, paid_on date, check_number text null, created_at) and
  `POST /jobs/{id}/payments` → returns the job with its payments; the backend sets PAID + `paid_at` when the
  sum reaches the total. `GET /jobs/{id}` includes `payments`.

### 9. Edit contact details after sending
- **Problem:** once an estimate is sent, only the phone can be changed; a misspelled name or address
  stays wrong.
- **Build:** on the job page after sending (`TrackJob` in `src/app/trabajos/[id]/page.tsx`), let Carlos
  edit the client's name, phone and address. Price and work stay locked. Re-publish the customer link
  after saving (`publishEstimate` in `src/lib/relay.ts`) so the client sees the fix.
- "Revise estimate" (a v2 when price or work changes) is a separate, bigger task for later.
- **Done when:** fixing a name on a sent estimate updates the job, the documents list, and the customer's
  link; price and lines still can't be edited.
- **Built:** `updateContact` in `src/lib/api.ts` (keeps `updated_at`, re-publishes the link) and
  `ContactSheet` on the job page. Backend: the existing job update already takes `customer_name`, phone and
  address; when the backend becomes the source of truth, a contact fix shouldn't bump `updated_at`.

### 10. Voice hears only Carlos
- **Problem (found testing on a phone):** the mic sends everything it hears to ElevenLabs. A TV in the room
  got written into the job, and some words came out in the wrong language, because ElevenLabs guesses the
  language when it isn't told.
- **Build:**
  - `src/app/trabajos/nuevo/page.tsx`: send the app's language with the recording, and ask `getUserMedia` for
    `echoCancellation`, `noiseSuppression` and `autoGainControl`.
  - `src/app/api/voice/route.ts`: pass ElevenLabs `language_code` (Spanish or English; Spanish still catches
    English trade words like "drywall") and `diarize: true`, then keep only the words of the speaker who
    talks the most (the person holding the phone).
- **To confirm (Abe):** if Carlos records next to the customer, the customer's words are dropped too (Mano listens
  to Carlos, not the room). Proposed: yes.
- **Done when:** with a TV or another person talking in the background, the note has only Carlos's words, in
  the right language, in Spanish and English. The phone's own speech recognition (fallback) still works.

## Extra changes (done, after the list)

| Change | Commit | Josh / Chris |
|--------|--------|--------------|
| Payment sheet: simpler layout + progress bar | `5a95258` | — |
| Welcome screen: light background, dark green button and logo | `a1b9680`, `da3d48e` | — |
| New brand palette (colors only): forest `#073D2D`, ivory `#F5F5ED`, white cards, charcoal `#202522`, sage `#DDE7D8`, status pairs. Tokens in `globals.css` | `fd77173` | — |
| UX fixes: undo a payment; customer invoice wording when overdue or partly paid; no "due in 15 days" on paid invoices; "Cómo te pagan" (Zelle, checks…) on invoices; paid job shows a sage box; no "$0" on clients | `2ceefb6` | Josh: `pay_info` text on the business, and `DELETE /jobs/{id}/payments/{pid}` (job back to PAYMENT_PENDING if it drops below the total) |
| Payment reminder says the due date ("was due on October 13" when overdue); optional "Cómo te pagan" in onboarding step 2. Paid message sits under the approval line | `7966f05`, `490e886` | — |
| Invoice due dates: default terms in Tu negocio (on receipt / 7 / 15 / 30 days) and a date picker per invoice; due dates run to the end of the day | `3da1ed4` | Josh: `invoice_due_days` on the business (default 15); invoices already have `invoice_due_at`, and it should be settable on the invoice |
| PDF download: real PDF of the estimate/invoice (Carlos's pages: English customer version; customer link: their language). Phone opens the share sheet, computer downloads. New dependency `@react-pdf/renderer` → run `npm ci` after pulling | `1ea4ded` | — (made on the phone, no backend). Later, for email: the backend could make the same PDF |
| PDF with the app's fonts; PDF in the send box ("Copiar · QR · PDF", counts as sending). Bug: "Facturar sin estimado" still showed "send the estimate" on Home until sent — fixed with `isInvoiceJob()` | `422dadd` | — |
| PDF preview removed (the page already shows the document): "Descargar PDF" downloads; the send box's "PDF" opens the share sheet | `04daf45` | — |


## After this list
Tasks 0–9 are done on `abe/experiments`; task 10 came from testing on a phone. Next step: a pull request into `dev` when Abe says so.


The rest of the MVP (hosting, logins, the database as the source of truth, PDF and email, deposits,
change orders, notifications, sales tax) needs team decisions and Josh's backend. See section 3 of
"Mano: Vision & Roadmap": https://claude.ai/code/artifact/91e04b3e-6600-4d5d-9cdf-191a2acebb0c
