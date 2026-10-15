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
| 7 | Search | ⏭ Next | |
| 8 | Mark as paid: method and partial payments | To do (needs Josh later) | |
| 9 | Edit contact details after sending | To do | |

Update this table (status + commit) after each task.

## Next tasks in detail

### 5. Invoice and estimate views: no dead end
- **Problem:** after an estimate or invoice is sent, "View estimate/invoice" opens a page with only the
  document and a back arrow. Carlos can't tell that sending again, mark as paid and follow-up live on the
  job page.
- **Build:** in `src/app/trabajos/[id]/estimado/page.tsx` and `src/app/trabajos/[id]/factura/page.tsx`,
  when the page is view-only (no "Preparar para enviar" button showing), add a button at the bottom:
  **"Volver al trabajo"** / "Back to the job" → `/trabajos/[id]`.
- "Descargar PDF" comes later with the PDF feature; leave room for it, don't fake it.
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

### 9. Edit contact details after sending
- **Problem:** once an estimate is sent, only the phone can be changed; a misspelled name or address
  stays wrong.
- **Build:** on the job page after sending (`TrackJob` in `src/app/trabajos/[id]/page.tsx`), let Carlos
  edit the client's name, phone and address. Price and work stay locked. Re-publish the customer link
  after saving (`publishEstimate` in `src/lib/relay.ts`) so the client sees the fix.
- "Revise estimate" (a v2 when price or work changes) is a separate, bigger task for later.
- **Done when:** fixing a name on a sent estimate updates the job, the documents list, and the customer's
  link; price and lines still can't be edited.

## After this list
The rest of the MVP (hosting, logins, the database as the source of truth, PDF and email, deposits,
change orders, notifications, sales tax) needs team decisions and Josh's backend. See section 3 of
"Mano: Vision & Roadmap": https://claude.ai/code/artifact/91e04b3e-6600-4d5d-9cdf-191a2acebb0c
