// Fake API backed by localStorage. When the FastAPI backend is ready, replace each
// function body with a fetch() call — the screens won't need to change.

import { loadBusiness, knownNameFix } from "@/lib/business";
import { interpret } from "@/lib/mano";
import { validate } from "@/lib/ojo";
import { publishEstimate } from "@/lib/relay";
import { matchClient } from "@/lib/match";

export type JobStatus =
  | "NEW"
  | "NEEDS_INFORMATION"
  | "READY_FOR_QUOTE"
  | "QUOTE_SENT"
  | "ACCEPTED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "CANCELLED"; // off the main flow — archived, can be reactivated

export const STATUS_FLOW: JobStatus[] = [
  "NEW",
  "NEEDS_INFORMATION",
  "READY_FOR_QUOTE",
  "QUOTE_SENT",
  "ACCEPTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "PAYMENT_PENDING",
  "PAID",
];

// price_source: where the amount came from — "spoken" (Carlos said it) or "manual" (typed on the job page).
// Mano never suggests prices; anything unsaid stays null and Ojo flags "falta precio".
export type PriceSource = "spoken" | "manual";
// Two languages per line: Carlos reads/edits `description_es`; the customer's estimate & invoice always use
// `description` (English). If Mano couldn't translate Carlos's Spanish yet, `translation_pending` is true.
export type LineItem = {
  id: string;
  description: string; // English — customer-facing
  description_es?: string | null; // Carlos's language
  translation_pending?: boolean;
  amount: number | null;
  price_source?: PriceSource | null;
  site?: string | null; // one invoice for several houses (a company client): the address this line is for (app only)
};

// An Ojo question from Gemini, for trades without a built-in checklist (same shape as Ojo's Suggestion)
export type OjoAiQuestion = { key: string; es: string; en: string; item: string; item_es: string };

export type Job = {
  id: number;
  customer_name: string | null;
  customer_email?: string | null; // optional — printed under "Bill to"; later, where Mano emails the PDF (app only)
  // Mano matched the note to a saved client: their spelling + the details it filled in (✕ puts it back)
  client_match?: { name: string; heard: string | null; filled: ("address" | "customer_phone" | "customer_email")[] } | null;
  customer_phone?: string | null; // optional — never required by Ojo; enables one-tap WhatsApp / SMS
  address: string | null;
  service: string;
  service_es?: string | null;
  // One price for the whole job ("Total 1400$ only labor"): items list the work, no per-item prices.
  // Set → the job total is this; null/absent → the total is the sum of the items.
  job_total?: number | null;
  invoice_due_custom?: boolean; // Carlos picked this invoice's due date himself → sending doesn't reset it (app only)
  note_totals?: number[]; // "Total" amounts written on a scanned/typed note, to check against the item prices (app only)
  payments?: Payment[]; // money received on the invoice, full or partial (app only until the backend has payments)
  price_note?: string | null; // what the price covers, for the customer ("Labor only")
  price_note_es?: string | null; // same note, for Carlos ("Solo mano de obra")
  doc_intent?: "invoice" | null;
  customer_name_heard?: string | null; // the name exactly as Mano read it — to remember Carlos's correction
  customer_name_suggested?: string | null; // Mano's spelling fix, shown as "¿Quisiste decir…?" — never applied by itself // Carlos picked "Factura" on Nuevo trabajo (work already done) → the job screen leads with the invoice // Spanish name for Carlos (from Gemini). The built-in job types have fixed names in services.ts
  description: string;
  line_items: LineItem[];
  status: JobStatus;
  created_at: string;
  updated_at: string;
  // Documents — numbers are assigned only when Carlos approves & sends, so there are no gaps
  estimate_number: number | null;
  estimate_sent_at: string | null;
  invoice_number: number | null;
  invoice_sent_at: string | null;
  invoice_due_at: string | null;
  paid_at: string | null;
  // Customer link — the homeowner opens /e/<public_token> in any browser, no app or account
  public_token: string | null;
  approved_at: string | null;
  approved_by: string | null; // name the homeowner typed as a signature
  // Cancellation (only after an estimate was sent; drafts are deleted instead)
  cancelled_at: string | null;
  cancel_reason: CancelReason | null;
  cancelled_from: JobStatus | null;
  // Ojo checklist questions Carlos answered "no aplica" for on this job
  ojo_dismissed?: string[];
  // Carlos tapped ✕ on "Ojo pregunta" — skip all of Ojo's questions for this job (reversible)
  ojo_skipped?: boolean;
  ojo_ai?: OjoAiQuestion[] | null;
  // Copy in Josh's backend (Postgres). Only jobs made with "Nuevo trabajo" are sent (not the samples).
  scheduled_for?: string | null; // "2026-10-14": the day the work is scheduled (set when Carlos taps "Agendar")
  backend_sync?: "pending" | "ok" | "error";
  backend_id?: string; // the database's job_id
  backend_sent?: string; // what was last sent (to skip sending the same thing twice)
  backend_status?: string; // the status the database has // Gemini's questions for this job; asked once, then kept (undefined = not asked yet)
};

export type CancelReason = "declined" | "no_response" | "other";
export const CANCEL_REASONS: CancelReason[] = ["declined", "no_response", "other"];

// Drafts were never sent and used no numbers → safe to delete for good
export const canDelete = (j: Job) =>
  !j.estimate_number && j.status !== "CANCELLED" && STATUS_FLOW.indexOf(j.status) <= STATUS_FLOW.indexOf("READY_FOR_QUOTE");
// Sent but not invoiced → archive instead of delete, so estimate numbers never disappear
export const canCancel = (j: Job) => !!j.estimate_number && !j.invoice_number && j.status !== "CANCELLED" && j.status !== "PAID";

export const INVOICE_DUE_DAYS = 15;
/** "2026-10-31" → the end of that day, so an invoice due today isn't overdue until tomorrow. */
export const endOfDay = (day: string) => new Date(`${day}T23:59:59`).toISOString();
const dayOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Due date from Carlos's terms (Tu negocio), counted from `from`. */
export const defaultDue = (from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + (loadBusiness()?.invoiceDueDays ?? INVOICE_DUE_DAYS));
  return endOfDay(dayOf(d));
};
/** "2026-10-31" from a stored due date, for a date input. */
export const dueDay = (iso: string) => dayOf(new Date(iso));
export const estimateNo = (n: number) => `EST-${String(n).padStart(4, "0")}`;
export const invoiceNo = (n: number) => `INV-${String(n).padStart(4, "0")}`;

const KEY = "mano.jobs";
const DAY = 86_400_000;

const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
export const uid = () => Math.random().toString(36).slice(2, 9);
export const isLumpSum = (job: Pick<Job, "job_total">) => job.job_total != null;
export const jobTotal = (job: Job) => (isLumpSum(job) ? job.job_total! : job.line_items.reduce((s, i) => s + (i.amount ?? 0), 0));
export const money = (n: number) => `$${n.toLocaleString("en-US")}`;
export const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
// "Maria Lopez" → "Maria". A company keeps its full name ("ATL Homeiker", not "ATL"):
// an all-caps first word, or a business word in the name.
const COMPANY = /\b(llc|inc|co|corp|company|group|homes?|builders?|construction|properties|property|realty|services|management|contractors?)\b\.?/i;
export const firstName = (name: string | null) => {
  const full = (name ?? "").trim();
  if (!full) return "—";
  const first = full.split(/\s+/)[0];
  const allCaps = first.length >= 2 && first === first.toUpperCase() && /[A-Z]/.test(first);
  return allCaps || COMPANY.test(full) ? full : first;
};

const NO_DOCS = {
  estimate_number: null,
  estimate_sent_at: null,
  invoice_number: null,
  invoice_sent_at: null,
  invoice_due_at: null,
  paid_at: null,
  cancelled_at: null,
  cancel_reason: null,
  cancelled_from: null,
  public_token: null,
  approved_at: null,
  approved_by: null,
};

const newToken = () => Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);

// a date inside the current month (never last month, even on the 1st)
const paidThisMonth = () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return new Date(Math.max(Date.now() - 2 * DAY, monthStart + 3_600_000)).toISOString();
};

function seed(): Job[] {
  return [
    {
      id: 1,
      customer_name: "Maria Rodriguez",
      customer_phone: "(832) 555-0142",
      address: "214 Oak St, Houston, TX",
      service: "Interior Painting",
      description: "Pintar la sala y cocina para Maria Rodriguez, dos manos, y reparar una grieta en la pared.",
      line_items: [
        { id: uid(), description: "Living room and kitchen, 2 coats", description_es: "Sala y cocina, 2 manos", amount: 1240 },
        { id: uid(), description: "Wall crack repair", description_es: "Reparar grieta en la pared", amount: 180 },
      ],
      status: "QUOTE_SENT",
      created_at: ago(4),
      updated_at: ago(3),
      ...NO_DOCS,
      estimate_number: 3,
      estimate_sent_at: ago(3),
      public_token: "maria-x7k2p9",
    },
    {
      id: 2,
      customer_name: "Juan Pérez",
      address: null,
      service: "Drywall Repair",
      description: "Juan Pérez tiene un hoyo en el drywall del cuarto, hay que parcharlo y texturizar.",
      line_items: [{ id: uid(), description: "Drywall patch, bedroom", description_es: "Parche de drywall, cuarto", amount: null }],
      status: "NEEDS_INFORMATION",
      created_at: ago(1),
      updated_at: ago(1),
      ...NO_DOCS,
    },
    {
      id: 3,
      customer_name: "Ana García",
      address: "88 Pine Ave, Houston, TX",
      service: "Interior Painting",
      description: "Pintar la cocina de Ana García.",
      line_items: [
        { id: uid(), description: "Kitchen, 2 coats", description_es: "Cocina, 2 manos", amount: 420 },
        { id: uid(), description: "Kitchen cabinets, 2 coats", description_es: "Gabinetes de cocina, 2 manos", amount: 530 },
      ],
      status: "SCHEDULED",
      created_at: ago(6),
      updated_at: ago(0),
      ...NO_DOCS,
      estimate_number: 2,
      estimate_sent_at: ago(6),
      public_token: "ana-q4m8v1",
      approved_at: ago(5),
      approved_by: "Ana García",
    },
    {
      id: 5,
      customer_name: "Luis Gómez",
      address: "77 Maple Ct, Sugar Land, TX",
      service: "Interior Painting",
      description: "Pintar la cocina y los gabinetes de Luis Gómez.",
      line_items: [
        { id: uid(), description: "Kitchen, 2 coats", description_es: "Cocina, 2 manos", amount: 650 },
        { id: uid(), description: "Kitchen cabinets, 2 coats", description_es: "Gabinetes de cocina, 2 manos", amount: 500 },
      ],
      status: "PAID",
      created_at: ago(21),
      updated_at: paidThisMonth(),
      ...NO_DOCS,
      estimate_number: 4,
      estimate_sent_at: ago(20),
      public_token: "luis-m3n8r2",
      approved_at: ago(19),
      approved_by: "Luis Gómez",
      invoice_number: 2,
      invoice_sent_at: ago(8),
      invoice_due_at: ago(8 - INVOICE_DUE_DAYS),
      paid_at: paidThisMonth(),
    },
    {
      id: 4,
      customer_name: "Pedro Sánchez",
      customer_phone: "(281) 555-0187",
      address: "1502 Elm Dr, Katy, TX",
      service: "Drywall Repair",
      description: "Parchar dos hoyos en el drywall de la sala de Pedro Sánchez y texturizar.",
      line_items: [
        { id: uid(), description: "Drywall patches (2), living room", description_es: "Parches de drywall (2), sala", amount: 360 },
        { id: uid(), description: "Texture matching", description_es: "Igualar textura", amount: 120 },
      ],
      status: "PAYMENT_PENDING",
      created_at: ago(30),
      updated_at: ago(18),
      ...NO_DOCS,
      estimate_number: 1,
      estimate_sent_at: ago(28),
      public_token: "pedro-k2w9z3",
      approved_at: ago(27),
      approved_by: "Pedro Sánchez",
      invoice_number: 1,
      invoice_sent_at: ago(18),
      invoice_due_at: ago(18 - INVOICE_DUE_DAYS),
    },
  ];
}

function read(): Job[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Job[];
  } catch {}
  return [];
}

// New user (after onboarding) starts empty; "Ya tengo cuenta" loads the sample jobs for the demo.
export function resetJobs({ demo }: { demo: boolean }) {
  write(demo ? seed() : []);
}

function write(jobs: Job[], { quiet = false }: { quiet?: boolean } = {}) {
  const before = read();
  try {
    localStorage.setItem(KEY, JSON.stringify(jobs));
  } catch {}
  // other tabs hear the `storage` event; THIS tab needs its own signal (e.g. an approval synced from a phone)
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(JOBS_EVENT, { detail: { before, after: jobs } }));
  if (!quiet) queueBackendSync(before, jobs);
}

/* ───────── Copy to Josh's backend, in the background ─────────
   The app keeps reading from the browser. Every saved change to a job made with "Nuevo trabajo" is
   sent to the backend a moment later (create, edit, move forward, delete). If the backend is off,
   nothing breaks: the job shows "Sin conexión con la base de datos" and the next change retries. */

const syncTimers = new Map<number, ReturnType<typeof setTimeout>>();

function queueBackendSync(before: Job[], after: Job[]) {
  if (typeof window === "undefined") return;
  for (const job of after) {
    if (!job.backend_sync) continue;
    clearTimeout(syncTimers.get(job.id));
    syncTimers.set(job.id, setTimeout(() => void syncJob(job.id), 800)); // typing → one request, not one per key
  }
  const gone = before.filter((b) => b.backend_id && !after.some((a) => a.id === b.id));
  for (const job of gone) void import("@/lib/backend").then((b) => b.deleteRemoteJob(job.backend_id!)).catch(() => {});
}

function saveSyncResult(id: number, patch: Partial<Job>) {
  write(read().map((j) => (j.id === id ? { ...j, ...patch } : j)), { quiet: true }); // quiet: don't sync the sync
}

async function syncJob(id: number) {
  const job = read().find((j) => j.id === id);
  if (!job?.backend_sync) return;
  const b = await import("@/lib/backend");
  const sent = JSON.stringify(b.backendFields(job));
  const wantStatus = b.isBackendState(job.status) && job.status !== job.backend_status ? job.status : null;
  if (job.backend_id && sent === job.backend_sent && !wantStatus && job.backend_sync === "ok") return;
  try {
    let backendId = job.backend_id;
    let status = job.backend_status;
    if (!backendId) {
      const created = await b.createRemoteJob(job);
      backendId = created.job_id;
      status = created.status;
    } else if (sent !== job.backend_sent) {
      status = (await b.updateRemoteJob(backendId, job)).status;
    }
    if (b.isBackendState(job.status) && job.status !== status) {
      // forward only on the backend; going "back" (e.g. a draft re-checked by Ojo) isn't an error here
      status = await b.moveRemoteJob(backendId, job.status).then((r) => r.status, () => status);
    }
    saveSyncResult(id, { backend_sync: "ok", backend_id: backendId, backend_sent: sent, backend_status: status });
  } catch {
    saveSyncResult(id, { backend_sync: "error" });
  }
}

const JOBS_EVENT = "mano:jobs-changed";

/** Subscribe to job changes from this tab or any other tab. Returns an unsubscribe function. */
export function onJobsChange(cb: (before: Job[], after: Job[]) => void): () => void {
  const parse = (v: string | null): Job[] => {
    try {
      return v ? (JSON.parse(v) as Job[]) : [];
    } catch {
      return [];
    }
  };
  const onStorage = (e: StorageEvent) => e.key === KEY && cb(parse(e.oldValue), parse(e.newValue));
  const onLocal = (e: Event) => {
    const { before, after } = (e as CustomEvent<{ before: Job[]; after: Job[] }>).detail;
    cb(before, after);
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(JOBS_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(JOBS_EVENT, onLocal);
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// GET /jobs
export async function getJobs(): Promise<Job[]> {
  return read().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

// GET /jobs/:id
export async function getJob(id: number): Promise<Job | null> {
  return read().find((j) => j.id === id) ?? null;
}

// POST /jobs  — backend runs Mano (interpret) then Ojo (validate)
export async function createJob(
  description: string,
  opts: {
    docIntent?: "estimate" | "invoice";
    client?: KnownClient | null; // started from a client card: theirs, whatever the note says
    clients?: KnownClient[]; // otherwise: Carlos's saved and past clients, to recognize the name in the note
  } = {},
): Promise<Job> {
  const jobs = read();
  const now = new Date().toISOString();
  const parsed = await interpret(description, loadBusiness()?.otherTrade);
  // Started from a client ("Nuevo estimado para Maria"): their details win over what Mano heard
  if (opts.client?.name.trim()) {
    Object.assign(parsed, {
      customer_name: opts.client.name.trim(),
      customer_name_suggested: null,
      address: opts.client.address?.trim() || parsed.address,
      customer_phone: opts.client.phone?.trim() || parsed.customer_phone,
      customer_email: opts.client.email?.trim() || null,
    });
  }
  // Carlos already corrected this name on an earlier job → use his spelling
  const heard = parsed.customer_name ?? null;
  const fixed = knownNameFix(heard);
  if (fixed) Object.assign(parsed, { customer_name: fixed, customer_name_suggested: null });
  // A client he already has ("Atlanta Homeiker" = his saved "ATL Homemaker"): their spelling, and the
  // details the note didn't say (office address, phone, email). The note's own details always win.
  let client_match: Job["client_match"] = null;
  const known = !opts.client?.name.trim() ? matchClient([parsed.customer_name, parsed.customer_name_suggested], opts.clients ?? []) : null;
  if (known) {
    const filled: NonNullable<Job["client_match"]>["filled"] = [];
    if (!parsed.address?.trim() && known.address?.trim()) (parsed.address = known.address.trim()), filled.push("address");
    if (!parsed.customer_phone?.trim() && known.phone?.trim()) (parsed.customer_phone = known.phone.trim()), filled.push("customer_phone");
    const customer_email = known.email?.trim() || null;
    if (customer_email) filled.push("customer_email");
    if (known.name !== parsed.customer_name || filled.length) {
      client_match = { name: known.name, heard: parsed.customer_name ?? null, filled };
      Object.assign(parsed, { customer_name: known.name, customer_name_suggested: null, customer_email });
    }
  }
  parsed.line_items = parsed.line_items.map((item) => ({
    ...item,
    ...(item.amount != null ? { price_source: "spoken" as const } : {}),
  }));
  const draft: Job = {
    id: Math.max(0, ...jobs.map((j) => j.id)) + 1,
    ...parsed,
    description,
    backend_sync: "pending",
    doc_intent: opts.docIntent === "invoice" ? "invoice" : null,
    customer_name_heard: heard,
    client_match,
    status: "NEW",
    created_at: now,
    updated_at: now,
    ...NO_DOCS,
  };
  draft.status = validate(draft).length ? "NEEDS_INFORMATION" : "READY_FOR_QUOTE";
  write([...jobs, draft]);
  return draft;
}

// PATCH /jobs/:id  — Ojo re-validates whenever details change before the quote is sent
export async function updateJob(id: number, patch: Partial<Job>): Promise<Job> {
  const jobs = read();
  const i = jobs.findIndex((j) => j.id === id);
  const next: Job = { ...jobs[i], ...patch, updated_at: new Date().toISOString() };
  if (!patch.status && canDelete(next)) {
    next.status = validate(next).length ? "NEEDS_INFORMATION" : "READY_FOR_QUOTE";
  }
  jobs[i] = next;
  write(jobs);
  return next;
}

// PATCH /jobs/:id — fix the client's name, phone or address after sending. Price and work stay locked.
// Keeps updated_at: a spelling fix shouldn't restart the "no answer in 2 days" clock.
export async function updateContact(id: number, contact: Pick<Job, "customer_name" | "customer_phone" | "customer_email" | "address">): Promise<Job> {
  const jobs = read();
  const i = jobs.findIndex((j) => j.id === id);
  jobs[i] = { ...jobs[i], ...contact };
  write(jobs);
  if (jobs[i].public_token) void publishEstimate(jobs[i], loadBusiness()); // the customer's link shows the fix
  return jobs[i];
}

export async function setStatus(id: number, status: JobStatus): Promise<Job> {
  return updateJob(id, { status });
}

// POST /jobs/:id/actions  — Carlos approved; Mano "sends" (mock just records the time)
export async function sendMessage(id: number): Promise<Job> {
  await wait(600);
  return updateJob(id, {});
}

// Next number = highest used + 1. On the backend this should be a DB sequence per business.
function nextNumber(field: "estimate_number" | "invoice_number") {
  return Math.max(0, ...read().map((j) => j[field] ?? 0)) + 1;
}

// Preparing ≠ sending: "Preparar" gives the document its number and the customer link, but the job only
// counts as sent once Carlos actually shares it (WhatsApp, text, copy, QR) — see markSent().
export const isUnsent = (j: Job) => (j.invoice_number ? !j.invoice_sent_at : !!j.estimate_number && !j.estimate_sent_at);

export async function prepareEstimate(id: number): Promise<Job> {
  await wait(600);
  const job = (await getJob(id))!;
  const ready = await updateJob(id, {
    estimate_number: job.estimate_number ?? nextNumber("estimate_number"),
    public_token: job.public_token ?? newToken(),
  });
  void publishEstimate(ready, loadBusiness()); // demo relay: lets a phone on the Wi-Fi open & approve it
  return ready;
}

// POST /jobs/:id/estimate/send · /invoice/send — the first time Carlos shares the link
export async function markSent(id: number): Promise<Job> {
  const job = (await getJob(id))!;
  if (!isUnsent(job)) return job;
  const now = new Date();
  const sent = job.invoice_number
    ? await updateJob(id, {
        status: "PAYMENT_PENDING",
        invoice_sent_at: now.toISOString(),
        // counted from the day it's really sent, unless Carlos picked the date himself
        invoice_due_at: job.invoice_due_custom && job.invoice_due_at ? job.invoice_due_at : defaultDue(now),
      })
    : await updateJob(id, { status: "QUOTE_SENT", estimate_sent_at: now.toISOString() });
  void publishEstimate(sent, loadBusiness());
  return sent;
}

// POST /jobs/:id/invoice/send
// Invoice without an estimate: a complete draft (e.g. small/already-done jobs) can be invoiced directly.
// Skips QUOTE_SENT…COMPLETED — the backend must allow READY_FOR_QUOTE → PAYMENT_PENDING (see handoff §3).
/** The houses on a job with several sites, in order ("700 Wilson", "2791 Midway"); [] for a normal job. */
export const jobSites = (j: Job) => [...new Set(j.line_items.map((i) => i.site?.trim()).filter((s): s is string => !!s))];
/** Lines grouped by site, in order. A normal job: one group with site null. */
export function linesBySite<T extends { site?: string | null }>(lines: T[]): { site: string | null; lines: T[] }[] {
  const groups: { site: string | null; lines: T[] }[] = [];
  for (const l of lines) {
    const site = l.site?.trim() || null;
    const g = groups.find((x) => x.site === site);
    if (g) g.lines.push(l);
    else groups.push({ site, lines: [l] });
  }
  return groups;
}

/** A client Carlos already has (saved on Clientes, or from an earlier job). */
export type KnownClient = { name: string; phone: string | null; email: string | null; address: string | null };

/** An invoice job: Carlos picked "Factura" on New job, or he invoiced it directly ("Facturar sin estimado"). */
export const isInvoiceJob = (j: Job) => j.doc_intent === "invoice" || !!j.invoice_number;
export const canInvoiceDirectly = (j: Job) => canDelete(j) && validate(j).length === 0;
export const canSendInvoice = (j: Job) => !j.invoice_number && (j.status === "COMPLETED" || canInvoiceDirectly(j));

export async function prepareInvoice(id: number, due?: string): Promise<Job> {
  await wait(600);
  const job = (await getJob(id))!;
  if (!canSendInvoice(job)) throw new Error("This job can't be invoiced yet");
  const now = new Date();
  const ready = await updateJob(id, {
    invoice_number: job.invoice_number ?? nextNumber("invoice_number"),
    // Carlos's date if he changed it; otherwise his terms, restarted by markSent() on the day it's really sent
    invoice_due_at: due && endOfDay(due) !== defaultDue(now) ? endOfDay(due) : defaultDue(now),
    invoice_due_custom: !!due && endOfDay(due) !== defaultDue(now),
    // the same customer link shows the invoice now (a job invoiced without an estimate gets one here)
    public_token: job.public_token ?? newToken(),
  });
  void publishEstimate(ready, loadBusiness());
  return ready;
}

// PATCH /jobs/:id {invoice_due_at} — a client asked for more time
export async function setInvoiceDue(id: number, day: string): Promise<Job> {
  const saved = await updateJob(id, { invoice_due_at: endOfDay(day), invoice_due_custom: true });
  if (saved.public_token) void publishEstimate(saved, loadBusiness()); // the customer's link shows the new date
  return saved;
}

// POST /jobs/:id/invoice/paid
// GET /public/estimates/:token  — what the homeowner sees (backend: return only safe fields)
export async function getJobByToken(token: string): Promise<Job | null> {
  return read().find((j) => j.public_token === token) ?? null;
}

// POST /public/estimates/:token/approve
export async function approveEstimate(token: string, name: string): Promise<Job> {
  await wait(700);
  const job = await getJobByToken(token);
  if (!job || job.status !== "QUOTE_SENT") throw new Error("This estimate can't be approved");
  return updateJob(job.id, { status: "ACCEPTED", approved_at: new Date().toISOString(), approved_by: name.trim() });
}

export const estimateLink = (job: Job, origin: string) => (job.public_token ? `${origin}/e/${job.public_token}` : null);

// DELETE /jobs/:id  — drafts only
export async function deleteJob(id: number): Promise<void> {
  const job = await getJob(id);
  if (!job || !canDelete(job)) throw new Error("Only unsent drafts can be deleted");
  write(read().filter((j) => j.id !== id));
}

// POST /jobs/:id/cancel
export async function cancelJob(id: number, reason: CancelReason): Promise<Job> {
  const job = (await getJob(id))!;
  if (!canCancel(job)) throw new Error("This job can't be cancelled");
  return updateJob(id, {
    status: "CANCELLED",
    cancelled_from: job.status,
    cancelled_at: new Date().toISOString(),
    cancel_reason: reason,
  });
}

// POST /jobs/:id/reactivate  — back to where it was; Ojo's clock restarts
export async function reactivateJob(id: number): Promise<Job> {
  const job = (await getJob(id))!;
  return updateJob(id, {
    status: job.cancelled_from ?? "QUOTE_SENT",
    cancelled_from: null,
    cancelled_at: null,
    cancel_reason: null,
  });
}

export type PaymentMethod = "zelle" | "bank" | "check" | "cash" | "card";
export const PAYMENT_METHODS: PaymentMethod[] = ["zelle", "bank", "check", "cash", "card"];
export type Payment = { id: string; amount: number; method: PaymentMethod; date: string; check_number?: string | null };

/** Money received so far. A job marked paid before payments were recorded counts as fully paid. */
export const paidSoFar = (job: Job) =>
  job.payments?.length ? job.payments.reduce((s, p) => s + p.amount, 0) : job.paid_at ? jobTotal(job) : 0;
/** What's still owed on the invoice. */
export const balanceDue = (job: Job) => Math.max(0, Math.round((jobTotal(job) - paidSoFar(job)) * 100) / 100);

// POST /jobs/:id/payments — Zelle, bank, check, cash or card; full or partial. Paid once it adds up to the total.
// DELETE /jobs/:id/payments/:pid — undo a payment typed wrong. If it was the one that made it paid, it's unpaid again.
export async function removePayment(id: number, paymentId: string): Promise<Job> {
  const job = (await getJob(id))!;
  const payments = (job.payments ?? []).filter((p) => p.id !== paymentId);
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const stillPaid = total >= jobTotal(job) - 0.005;
  const saved = await updateJob(id, stillPaid ? { payments } : { payments, status: job.status === "PAID" ? "PAYMENT_PENDING" : job.status, paid_at: null });
  if (saved.public_token && saved.invoice_number) void publishEstimate(saved, loadBusiness());
  return saved;
}

export async function addPayment(id: number, payment: Omit<Payment, "id">): Promise<Job> {
  const job = (await getJob(id))!;
  const payments = [...(job.payments ?? []), { ...payment, id: uid() }];
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const full = total >= jobTotal(job) - 0.005;
  const saved = await updateJob(id, full ? { payments, status: "PAID", paid_at: payment.date } : { payments });
  if (saved.public_token && saved.invoice_number) void publishEstimate(saved, loadBusiness()); // customer link shows the balance or "Paid"
  return saved;
}

export type InvoiceState = "ready" | "unpaid" | "overdue" | "paid";
export function invoiceState(job: Job): InvoiceState | null {
  if (!job.invoice_number) return null;
  if (job.paid_at) return "paid";
  if (!job.invoice_sent_at) return "ready"; // prepared, not shared with the customer yet
  return job.invoice_due_at && new Date(job.invoice_due_at) < new Date() ? "overdue" : "unpaid";
}

// Customer documents are always English; app screens pass Carlos's language
// Dashboard money card: what Carlos is owed (sent invoices not paid), how much is late, and paid this month.
export function moneySummary(jobs: Job[]) {
  const now = new Date();
  // an invoice only counts once it was actually sent (a prepared one isn't owed yet)
  const invoiced = jobs.filter((j) => j.invoice_number && j.invoice_sent_at && j.status !== "CANCELLED");
  const unpaid = invoiced.filter((j) => !j.paid_at);
  const owedOn = (list: Job[]) => list.reduce((s, j) => s + balanceDue(j), 0);
  const thisMonth = (iso: string) => {
    const d = new Date(iso);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  return {
    hasInvoices: invoiced.length > 0,
    owed: owedOn(unpaid),
    overdue: owedOn(unpaid.filter((j) => invoiceState(j) === "overdue")),
    // money that came in this month: each payment by its date (older jobs without payments: by paid date)
    paidThisMonth: invoiced.reduce(
      (s, j) =>
        s +
        (j.payments?.length
          ? j.payments.filter((p) => thisMonth(p.date)).reduce((a, p) => a + p.amount, 0)
          : j.paid_at && thisMonth(j.paid_at)
            ? jobTotal(j)
            : 0),
      0,
    ),
  };
}

// Short, NEUTRAL status for lists ("Enviado", "Facturado", "Pagado"…). Facts only — warnings (missing info,
// overdue, no reply) are Ojo's job, so this never repeats them.
export type JobBadge = "unsent" | "sent" | "accepted" | "scheduled" | "in_progress" | "done" | "invoiced" | "paid" | "cancelled";
export function jobBadge(j: Job): JobBadge {
  switch (j.status) {
    case "NEW":
    case "NEEDS_INFORMATION":
    case "READY_FOR_QUOTE":
      return "unsent";
    case "QUOTE_SENT":
      return "sent";
    case "ACCEPTED":
      return "accepted";
    case "SCHEDULED":
      return "scheduled";
    case "IN_PROGRESS":
      return "in_progress";
    case "COMPLETED":
      return "done";
    case "PAYMENT_PENDING":
      return "invoiced";
    case "PAID":
      return "paid";
    case "CANCELLED":
      return "cancelled";
  }
}

// Phone → links that open WhatsApp / Messages already addressed (US numbers get +1)
export function phoneDigits(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length === 10) return `1${d}`;
  if (d.length === 11 && d.startsWith("1")) return d;
  return d.length >= 8 ? d : null; // other countries: as typed
}
export const whatsappLink = (phone: string | null | undefined, text: string) => {
  const d = phoneDigits(phone);
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : null;
};
export const smsLink = (phone: string | null | undefined, text: string) => {
  const d = phoneDigits(phone);
  return d ? `sms:+${d}?&body=${encodeURIComponent(text)}` : null; // "?&body" works on iOS and Android
};

export const fmtDate = (iso: string, lang: "es" | "en" = "en") =>
  new Date(iso).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", year: "numeric" });

export function nextStatus(s: JobStatus): JobStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}
