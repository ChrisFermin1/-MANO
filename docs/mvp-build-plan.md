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
App data lives in the browser (localStorage). To start fresh, clear site data. Signing in is fake for now:
any 6-digit code works (000000 tests a wrong code), and Google / Apple sign you in right away. "Solo quiero
ver un ejemplo" on the sign-in screen (or "Ver un ejemplo" on the desktop Welcome) loads sample jobs. The backend (port 8000) doesn't need to run; the app shows
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
| 10 | Voice hears only Carlos (no TV, right language) | ✅ Done (test with a real TV on a phone) | `3dc2a52` |
| 11 | Estimate or invoice: required choice, nothing pre-selected | ✅ Done | `7459e94`, `eb90662` |
| 12 | Company clients + several sites on one invoice | ✅ Done (needs Josh later) | `b484aae` |
| 13 | Recognize saved clients in a note + client email | ✅ Done (needs Josh later) | `0475105` |
| 14 | Quantity × unit price per line | ✅ Done (needs Josh later) | `ef492be`, `631e818` |

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

### 11. Separate "+ Estimado" and "+ Factura"
- **Problem (Abe, testing):** New job has an Estimado/Factura switch with Estimado already selected, so it's
  easy to forget and make the wrong document. Undo exists (an estimate draft can still be invoiced, an
  invoice draft can still become an estimate), but the mistake keeps happening.
- **What other apps do:** Wave, QuickBooks and Joist have two separate starting points ("Create estimate" /
  "Create invoice"), never a switch with a default.
- **Build:**
  - Home (`src/app/inicio/page.tsx`): replace the single "Nuevo trabajo" button with two equal buttons:
    "+ Estimado" → `/trabajos/nuevo?doc=estimate`, "+ Factura" → `/trabajos/nuevo?doc=invoice`.
  - `src/app/trabajos/nuevo/page.tsx`: remove the switch. The title says what's being made ("Nuevo estimado" /
    "Nueva factura"). No `?doc` (old links): ask with two buttons before the mic, nothing pre-selected.
  - Keep working: the "+" on the Documents tabs, "Nuevo trabajo para Maria" on client cards (needs a choice too).
- **Done when:** you can't start a job without choosing; each starting point makes the right document, in
  Spanish and English.
- **Changed (Abe):** Home went back to ONE "+ Nuevo trabajo" button. It opens "¿Qué vas a hacer?"
  (Estimado / Factura, nothing pre-selected). The Documents "+" still goes straight to the right one.

### 12. Company clients + several sites on one invoice
- **Problem (found with a real note):** some clients are companies, e.g. ATL Homemaker, a renovation company
  that subcontracts Carlos for jobs at its customers' houses. One invoice can cover two houses:
  ```
  700 wilson
  Gabinetes y Storich 3500$
  2791 midway
  Pintura de Baños
  5000$
  Atlanta Homeiker
  ```
  Mano expects one address per job and a person's name (usually first), so it missed the client and the
  second address had nowhere to go.
- **Build:**
  - Each line item gets an optional `site` (address). The job's address stays as the client's billing address.
  - Note reader (`src/app/api/extract/route.ts`, `src/app/api/read-note/route.ts`): a business name anywhere in
    the note (often the last line) can be the client; an address line starts a new site for the lines under
    it. "Storich" = storage. Name fixes still apply ("Atlanta Homeiker" → "ATL Homemaker").
  - Estimate, invoice, PDF and job page: when lines have sites, group them under each address
    ("700 Wilson St · Cabinets and storage · $3,500"). One site or none: looks exactly like today.
  - Job page: the site can be edited on each line.
  - Saved clients: a company client keeps its office address and email for next time.
- **Josh later:** `site` (text, nullable) on line items; the customer can be a company (name only, no person).
- **Done when:** the note above becomes one invoice to ATL Homemaker with two sites and a total of $8,500,
  and a normal one-house job looks the same as before.
- **Built:** `LineItem.site`, `jobSites()`, `linesBySite()` (`src/lib/api.ts`); extraction assigns sites only
  when a note has 2+ addresses (one site = the job's address). Saved clients are matched in task 13.
- **Josh proposal:** `line_items.site` (text, nullable). `jobs.job_address` can be empty when lines have sites
  (it's the billing address). The backend sync doesn't send `site` yet.

### 13. Recognize saved clients in a note + client email
- **Problem:** started from "+ Factura" (not the client card), a note saying "Atlanta Homeiker" didn't connect to
  the saved "ATL Homemaker": no office address/phone/email, and a second spelling on Clientes. The job had no email.
- **Built:** `src/lib/match.ts` (`sameClient`, `matchClient`): words compared without accents/punctuation,
  short forms ("atl" ~ "atlanta") and small misspellings count; one-word names must match exactly. `createJob`
  gets Carlos's saved + past clients; a match uses the saved spelling and fills only missing address, phone,
  email (`client_match` remembers what it filled; the chip's ✕ puts it back). `customer_email` on the job.
- **Josh later:** `customer_email` on the customer/job.

### 14. Quantity × unit price per line
- **Built:** a line stays one amount until Carlos taps "Precio por cantidad". Then he types quantity, a unit ("ft²", "hr"…), and a unit price. The line total is quantity × unit price, rounded to cents ("450 ft² × $12" = $5,400). "Un solo precio" goes back to one amount and keeps that total. The estimate, invoice, PDF, job page, and Ojo's missing-price and note-total checks all use that total. A line with no quantity looks the same as before.
- **Josh proposal:** `line_items.quantity` numeric null, `line_items.unit` text null, `line_items.unit_price` numeric(10,2) null. When quantity and unit_price are both set, `amount` is their product (cents). When both are null, `amount` is the single line price, as today. The app sync still sends only that `amount`.

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
| Onboarding steps 1 and 2: Siguiente / Terminar pinned to the bottom, tighter spacing on phone screens (the button was below the screen in Safari) | `c719fc6` | — |
| New job: "Subir foto" next to "Escanear una nota" (photo library, screenshots); no glow on the onboarding trade check | `ce62629`, `43d5b27` | — |
| Onboarding asks what invoices need: first + last name, required phone, business email and address (address = where checks go), and a 3rd step "Cómo te pagan" (payment info + due terms). Invoices show email + address | `0dffe42` | Josh: business `email`, `address`; `owner_name` holds first + last |
| Phone numbers formatted as you type ((404) 555-0123); business phone must include the area code; "+" numbers left as typed | `d53eff7` | Josh: store phones as typed (formatted) or digits only; the app formats either |
| Ojo's "¿se te olvidó cobrar…?" questions off by default (switch in Tu negocio; no AI call when off). Ojo = missing info + what's next. Ask in contractor interviews if they forget to charge | `c0af5ce` | Chris: no change; backend Ojo (progress / what's stuck) is the main Ojo |
| Desktop layout (phase 1): sidebar with separate Estimados / Facturas, wider pages, two-column job page with the live document, typing-first New job. Phone unchanged. Next: tables for lists, client page (with the CRM) | `9b3bdf6` | — |
| Desktop that feels like desktop: full-width pages, breadcrumbs, compact buttons, centered dialogs, tables (jobs, estimates, invoices, clients), Home dashboard, job page actions bar. Phone unchanged | `333cde1`, `d8504e8` | — |
| Desktop made solid: visual pass fixes, shared job rows (`lib/rows.ts`) for phone cards and desktop tables, named layout regions instead of reordering | `f278453`, `6e723d3` | — |
| Accounts (frontend): one sign-in screen (`/entrar`) for new and returning people: phone + text code (main), Continue with Google, Continue with Apple, email code as backup, no passwords. New person → onboarding, existing business → Inicio. App pages need a session (Welcome, sign in and the client link `/e/…` stay open). Sign out (sidebar, Tu negocio), "Borrar mi cuenta" with a confirmation. Login is fake, all in `lib/auth.ts` | `fdd3fb3` | Team: pick the login service (Clerk, Supabase Auth, Firebase Auth, or Josh's own). Then only `lib/auth.ts` changes (same function names). Backend: every job, client and business row belongs to a user; check the session on every request; delete-account endpoint. Apple sign-in is required on the App Store if Google is offered |
| Landing page polish: one 12-column grid for the top bar, hero, demo and benefits; hero copy 7 columns / demo 5; benefits moved to their own band under the hero; calmer demo (no glass, Ojo note as wide as the estimate); tablet gets its own layout instead of the phone screen. Phone Welcome unchanged | `178e4db` | — |
| Website top bar for launch: wordmark (home), ES/EN, "Iniciar sesión" link, "Crear cuenta →" button (`/entrar?crear=1` shows "Crea tu cuenta"). `components/site-nav.tsx` has an empty sections list for Product / Pricing / Resources once those pages exist. `<html lang>` now follows the language; keyboard focus rings | `639cead` | — |
| Home dashboard polish: 12-column grid with 24px gutters; from 1280px summary 4 across, then next step (5 cols) + recent jobs (7 cols); 2 × 2 and stacked below that; tablet gets its own layout (summary + table). Summary cards all white with tabular numbers; recent jobs table with headers, address under the client, keyboard access. Sidebar spacing and focus rings | `65833da` | — |
| Tablet layout (768–1023px) for every page: 720px column, tables for Trabajos and Documentos (fewer columns than desktop), two client cards per row, centered dialogs. No sidebar on tablet | `d712e12` | — |
| Invoice numbers for people coming from Wave: "Tu próxima factura" in Tu negocio (e.g. 190; can't go below one already used) and "Número de factura" on the invoice page (no duplicates). Asked for by Edgar (ATL Homemaker invoices are at #189 in Wave) | `bcf3cc9` | Josh: business.next_invoice_number; PATCH /jobs/:id accepts invoice_number; unique (business_id, invoice_number) |
| Invoice terms match Wave: on receipt / 15 / 30 / 45 / 60 / 90 days (was 0 / 7 / 15 / 30); any other date per invoice as before | `f15ead3` | — |
| Photos & files + plans. Any job: photos and PDFs (site, design, materials, before/after, receipts, contracts) with a caption (Spanish → English for the client) and a "Solo para mí" switch; the client sees the shared ones on the link and as photo pages in the PDF. Plans in `lib/plan.ts` (fake checkout, like `lib/auth.ts`): Free = 3 photos per job, no PDFs; Solo $19 / Crew $49 (test prices) = unlimited + PDFs. Upgrade card where the limit hits, `/planes`, "Tu plan" in Tu negocio. Monthly document limits not enforced yet | `228f47c` | Josh: file storage (S3-type) + `job_files` (id, job_id, kind, name, mime, url, caption, caption_en, private, created_at), POST/PATCH/DELETE /jobs/:id/files, public files on GET /public/estimates/:token; `plan` on the business, set by the payment service's webhook. Team: payment service (Stripe on the web; Apple/Google rules if Mano goes in the stores) |
| "Prefiero llenarlo yo" on New job (empty form, no Mano); "Ver como tu cliente" on the estimate / invoice screens: Link (the real client page) and PDF (the real file, drawn with pdf.js); Solo / Crew hide "Sent with Mano" on the link and PDF. Next: quantity × unit price per line | `d494fbe` | Josh: nothing new for the fill-in form (same job). Branding: the public estimate endpoint returns whether the business's plan hides it |
| Invoice numbers are a plain `190`, like Wave (was `INV-0190`). Estimates stay `EST-0001`. The number on the job, Tu negocio, the invoice, the PDF, and search | `914c1ab` | Josh: still stores the integer. Display is the frontend's |
| Downloaded PDF is named with that number and the document's year: `190 Ana Garcia 2026.pdf` | `153ce8f` | — |
| PDF share sheet includes subject + message (e.g. "Invoice from Visão" / "Hi Maria, here's your invoice…"). Same copy as the link; PDF drops "see it here". Phone only; computer still downloads | `20e9bef` | — (OS Mail may use them; not a server send) |


## Where we left off (2026-10-20, for the next tool picking this up)

State: everything above is committed on `abe/experiments` (not pushed), including quantity × unit price
(`ef492be`). Run it with `npm run dev -- -p 3002` in `frontend/`. Login, plans/checkout and file storage are
FAKE on purpose, each in one file: `lib/auth.ts`, `lib/plan.ts`, `lib/attachments.ts` (IndexedDB) — keep the
function names when the real services come.

Open questions for Abe:
- Optional P.O. number on invoices (company clients like ATL Homemaker)? Invoice numbers are decided: a plain `190`, like Wave (`914c1ab`).

Next, in order:
1. Payments the owner never marks (the person billing isn't the one getting paid): ideas in chat were a
   client "Ya pagué" button on the link and a one-tap "Ya me pagó" on Home. Abe parked it.

Rules that still apply: Spanish-first copy (es + en in `lib/i18n.tsx`), design for all trades (not just
painting), phone + tablet + desktop each checked, no push / PR unless Abe says, never commit `.env.local`.
Careful: don't run `npm ci` anywhere `node_modules` is a symlink to this project's (it deletes the real one).

## After this list
Tasks 0–9 are done on `abe/experiments`; task 10 came from testing on a phone. Next step: a pull request into `dev` when Abe says so.


The rest of the MVP (hosting, logins, the database as the source of truth, PDF and email, deposits,
change orders, notifications, sales tax) needs team decisions and Josh's backend. See section 3 of
"Mano: Vision & Roadmap": https://claude.ai/code/artifact/91e04b3e-6600-4d5d-9cdf-191a2acebb0c
