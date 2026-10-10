// Fake API backed by localStorage. When the FastAPI backend is ready, replace each
// function body with a fetch() call — the screens won't need to change.

import { loadBusiness } from "@/lib/business";
import { interpret } from "@/lib/mano";
import { validate } from "@/lib/ojo";

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
};

export type Job = {
  id: number;
  customer_name: string | null;
  address: string | null;
  service: string;
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
};

export type CancelReason = "declined" | "no_response" | "other";
export const CANCEL_REASONS: CancelReason[] = ["declined", "no_response", "other"];

// Drafts were never sent and used no numbers → safe to delete for good
export const canDelete = (j: Job) =>
  !j.estimate_number && j.status !== "CANCELLED" && STATUS_FLOW.indexOf(j.status) <= STATUS_FLOW.indexOf("READY_FOR_QUOTE");
// Sent but not invoiced → archive instead of delete, so estimate numbers never disappear
export const canCancel = (j: Job) => !!j.estimate_number && !j.invoice_number && j.status !== "CANCELLED" && j.status !== "PAID";

export const INVOICE_DUE_DAYS = 15;
export const estimateNo = (n: number) => `EST-${String(n).padStart(4, "0")}`;
export const invoiceNo = (n: number) => `INV-${String(n).padStart(4, "0")}`;

const KEY = "mano.jobs";
const DAY = 86_400_000;

const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
export const uid = () => Math.random().toString(36).slice(2, 9);
export const jobTotal = (job: Job) => job.line_items.reduce((s, i) => s + (i.amount ?? 0), 0);
export const money = (n: number) => `$${n.toLocaleString("en-US")}`;
export const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
export const firstName = (name: string | null) => (name ?? "").split(" ")[0] || "—";

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

function write(jobs: Job[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(jobs));
  } catch {}
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
export async function createJob(description: string): Promise<Job> {
  await wait(1200); // feels like the AI is working
  const jobs = read();
  const now = new Date().toISOString();
  const parsed = await interpret(description, loadBusiness()?.otherTrade);
  parsed.line_items = parsed.line_items.map((i) => (i.amount != null ? { ...i, price_source: "spoken" } : i));
  const draft: Job = {
    id: Math.max(0, ...jobs.map((j) => j.id)) + 1,
    ...parsed,
    description,
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

// POST /jobs/:id/estimate/send
export async function sendEstimate(id: number): Promise<Job> {
  await wait(600);
  const job = (await getJob(id))!;
  const now = new Date().toISOString();
  return updateJob(id, {
    status: "QUOTE_SENT",
    estimate_number: job.estimate_number ?? nextNumber("estimate_number"),
    estimate_sent_at: now,
    public_token: job.public_token ?? newToken(),
  });
}

// POST /jobs/:id/invoice/send
export async function sendInvoice(id: number): Promise<Job> {
  await wait(600);
  const job = (await getJob(id))!;
  const now = new Date();
  return updateJob(id, {
    status: "PAYMENT_PENDING",
    invoice_number: job.invoice_number ?? nextNumber("invoice_number"),
    invoice_sent_at: now.toISOString(),
    invoice_due_at: new Date(now.getTime() + INVOICE_DUE_DAYS * DAY).toISOString(),
  });
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

export const estimateLink = (job: Job) =>
  job.public_token && typeof window !== "undefined" ? `${window.location.origin}/e/${job.public_token}` : null;

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

export async function markPaid(id: number): Promise<Job> {
  return updateJob(id, { status: "PAID", paid_at: new Date().toISOString() });
}

export type InvoiceState = "unpaid" | "overdue" | "paid";
export function invoiceState(job: Job): InvoiceState | null {
  if (!job.invoice_number) return null;
  if (job.paid_at) return "paid";
  return job.invoice_due_at && new Date(job.invoice_due_at) < new Date() ? "overdue" : "unpaid";
}

// Customer documents are always English; app screens pass Carlos's language
// Dashboard money card: what Carlos is owed (sent invoices not paid), how much is late, and paid this month.
export function moneySummary(jobs: Job[]) {
  const now = new Date();
  const invoiced = jobs.filter((j) => j.invoice_number && j.status !== "CANCELLED");
  const unpaid = invoiced.filter((j) => !j.paid_at);
  const sum = (list: Job[]) => list.reduce((s, j) => s + jobTotal(j), 0);
  return {
    hasInvoices: invoiced.length > 0,
    owed: sum(unpaid),
    overdue: sum(unpaid.filter((j) => invoiceState(j) === "overdue")),
    paidThisMonth: sum(
      invoiced.filter((j) => {
        if (!j.paid_at) return false;
        const d = new Date(j.paid_at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }),
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

export const fmtDate = (iso: string, lang: "es" | "en" = "en") =>
  new Date(iso).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", year: "numeric" });

export function nextStatus(s: JobStatus): JobStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}
