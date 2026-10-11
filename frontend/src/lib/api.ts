// Core Jobs use FastAPI. The existing document demos remain isolated below.
// UI aliases are mapped from the backend response; they are never persisted separately.

import { DEMO_BUSINESS_ID, loadBusiness } from "@/lib/business";
import { apiRequest } from "@/lib/http";
import { validate } from "@/lib/ojo";
import { publishEstimate } from "@/lib/relay";

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
  id: string; // presentation alias of job_id; demo IDs have a demo- prefix
  job_id: string;
  business_id: string;
  customer_id: string | null;
  job_title: string | null;
  job_description: string | null;
  job_address: string | null;
  job_price: string | null;
  start_date: string | null;
  missing_fields: string[];
  customer_name: string | null;
  customer_phone?: string | null; // optional — never required by Ojo; enables one-tap WhatsApp / SMS
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
// Decimal strings remain authoritative. Number conversion happens only in this
// presentation layer (legacy demo summaries also consume jobTotal).
export const jobTotal = (job: Job) => Number(job.job_price ?? 0);
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (value: string | number | null | undefined) => value == null ? "—" : currency.format(Number(value));
export const isLiveJob = (job: Job) => !job.id.startsWith("demo-");
export const missingFieldLabel = (key: string, lang: "es" | "en") => ({
  customer_name: lang === "es" ? "Cliente" : "Customer",
  job_description: lang === "es" ? "Descripción del trabajo" : "Job description",
  job_price: lang === "es" ? "Precio del trabajo" : "Job price",
}[key] ?? key);
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
  const samples = [
    {
      id: "demo-1",
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
      id: "demo-2",
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
      id: "demo-3",
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
      id: "demo-5",
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
      id: "demo-4",
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
  return samples.map((job) => ({
    ...job, status: job.status as JobStatus,
    job_id: job.id, business_id: DEMO_BUSINESS_ID, customer_id: null,
    job_title: job.service, job_description: job.description, job_address: job.address,
    job_price: job.line_items.reduce((sum, item) => sum + (item.amount ?? 0), 0).toFixed(2),
    start_date: null, missing_fields: [],
  }));
}

function read(): Job[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      // Older document samples used numeric IDs. Normalize only those demo
      // records; a real UUID record is never read from browser persistence.
      const samples = JSON.parse(raw) as Job[];
      return samples.filter((job) => typeof job.id === "number" || String(job.id).startsWith("demo-")).map((job) => {
        const id = String(job.id).startsWith("demo-") ? String(job.id) : `demo-${job.id}`;
        return {
          ...job, id, job_id: id, business_id: DEMO_BUSINESS_ID, customer_id: null,
          job_title: job.service, job_description: job.description, job_address: job.address,
          job_price: job.line_items.reduce((sum, item) => sum + (item.amount ?? 0), 0).toFixed(2),
          start_date: null, missing_fields: [],
        };
      });
    }
  } catch {}
  return [];
}

// New user (after onboarding) starts empty; "Ya tengo cuenta" loads the sample jobs for the demo.
export function resetJobs({ demo }: { demo: boolean }) {
  write(demo ? seed() : []);
}

function write(jobs: Job[]) {
  const before = read();
  try {
    localStorage.setItem(KEY, JSON.stringify(jobs));
  } catch {}
  // other tabs hear the `storage` event; THIS tab needs its own signal (e.g. an approval synced from a phone)
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(JOBS_EVENT, { detail: { before, after: jobs } }));
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

export type Customer = { customer_id: string; customer_name: string | null; phone_number: string | null };
export type JobCreateInput = {
  business_id: string; description: string;
  customer_id?: string; customer_name?: string; job_price?: string;
};

// The one existing frontend Job type serves both screens and demo previews.
// This projection describes only the wire response, not another domain model.
type JobResponse = Pick<Job, "job_id" | "business_id" | "customer_id" | "customer_name" | "job_title" | "job_description" | "job_address" | "job_price" | "status" | "start_date" | "created_at" | "updated_at" | "missing_fields"> & {
  line_items: { line_item_id: string; position: number; description: string; description_es: string | null; amount: string | null }[];
};

function fromResponse(data: JobResponse): Job {
  return {
    ...data, ...NO_DOCS,
    id: data.job_id,
    description: data.job_description ?? "",
    address: data.job_address,
    service: data.job_title || data.job_description || "",
    line_items: data.line_items.map((item) => ({
      ...item, id: item.line_item_id,
      amount: item.amount === null ? null : Number(item.amount),
    })),
  };
}

export async function getCustomers(businessId = DEMO_BUSINESS_ID): Promise<Customer[]> {
  return apiRequest(`/customers?business_id=${encodeURIComponent(businessId)}`);
}

export async function getJobs(): Promise<Job[]> {
  const jobs = await apiRequest<JobResponse[]>(`/jobs?business_id=${DEMO_BUSINESS_ID}`);
  return jobs.map(fromResponse);
}

/** The document demo cannot populate the live list or serve as an API fallback. */
export async function getDemoJobs(): Promise<Job[]> { return read(); }

export async function getJob(id: string): Promise<Job | null> {
  if (id.startsWith("demo-")) return read().find((job) => job.id === id) ?? null;
  return fromResponse(await apiRequest<JobResponse>(`/jobs/${encodeURIComponent(id)}`));
}

export async function createJob(input: JobCreateInput): Promise<Job> {
  const job = fromResponse(await apiRequest<JobResponse>("/jobs", { method: "POST", body: JSON.stringify(input) }));
  // Notification only: PostgreSQL remains the source on every reload.
  window.dispatchEvent(new CustomEvent(JOBS_EVENT, { detail: { before: [], after: [] } }));
  return job;
}

export type JobReviewInput = Partial<Pick<Job, "customer_id" | "job_description" | "job_price">>;

/** Update an existing real Job; status and missing fields come from FastAPI. */
export async function patchJob(jobId: string, changes: JobReviewInput): Promise<Job> {
  const job = fromResponse(await apiRequest<JobResponse>(`/jobs/${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  }));
  window.dispatchEvent(new CustomEvent(JOBS_EVENT, { detail: { before: [], after: [] } }));
  return job;
}

export async function updateJob(id: string, patch: Partial<Job>): Promise<Job> {
  if (!id.startsWith("demo-")) throw new Error("La edición de trabajos se habilitará en Revisar. No se guardaron cambios.");
  const jobs = read();
  const i = jobs.findIndex((j) => j.id === id);
  if (i < 0) throw new Error("Demo job not found");
  const next: Job = { ...jobs[i], ...patch, updated_at: new Date().toISOString() };
  if (!patch.status && canDelete(next)) {
    next.status = validate(next).length ? "NEEDS_INFORMATION" : "READY_FOR_QUOTE";
  }
  jobs[i] = next;
  write(jobs);
  return next;
}

export async function setStatus(id: string, status: JobStatus): Promise<Job> {
  return updateJob(id, { status });
}

// POST /jobs/:id/actions  — Carlos approved; Mano "sends" (mock just records the time)
export async function sendMessage(id: string): Promise<Job> {
  await wait(600);
  return updateJob(id, {});
}

// Next number = highest used + 1. On the backend this should be a DB sequence per business.
function nextNumber(field: "estimate_number" | "invoice_number") {
  return Math.max(0, ...read().map((j) => j[field] ?? 0)) + 1;
}

// POST /jobs/:id/estimate/send
export async function sendEstimate(id: string): Promise<Job> {
  await wait(600);
  const job = (await getJob(id))!;
  const now = new Date().toISOString();
  const sent = await updateJob(id, {
    status: "QUOTE_SENT",
    estimate_number: job.estimate_number ?? nextNumber("estimate_number"),
    estimate_sent_at: now,
    public_token: job.public_token ?? newToken(),
  });
  void publishEstimate(sent, loadBusiness()); // demo relay: lets a phone on the Wi-Fi open & approve it
  return sent;
}

// POST /jobs/:id/invoice/send
// Invoice without an estimate: a complete draft (e.g. small/already-done jobs) can be invoiced directly.
// Skips QUOTE_SENT…COMPLETED — the backend must allow READY_FOR_QUOTE → PAYMENT_PENDING (see handoff §3).
export const canInvoiceDirectly = (j: Job) => canDelete(j) && validate(j).length === 0;
export const canSendInvoice = (j: Job) => !j.invoice_number && (j.status === "COMPLETED" || canInvoiceDirectly(j));

export async function sendInvoice(id: string): Promise<Job> {
  await wait(600);
  const job = (await getJob(id))!;
  if (!canSendInvoice(job)) throw new Error("This job can't be invoiced yet");
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

export const estimateLink = (job: Job, origin: string) => (job.public_token ? `${origin}/e/${job.public_token}` : null);

// DELETE /jobs/:id  — drafts only
export async function deleteJob(id: string): Promise<void> {
  if (!id.startsWith("demo-")) throw new Error("Esta acción de demostración no modifica trabajos reales.");
  const job = await getJob(id);
  if (!job || !canDelete(job)) throw new Error("Only unsent drafts can be deleted");
  write(read().filter((j) => j.id !== id));
}

// POST /jobs/:id/cancel
export async function cancelJob(id: string, reason: CancelReason): Promise<Job> {
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
export async function reactivateJob(id: string): Promise<Job> {
  const job = (await getJob(id))!;
  return updateJob(id, {
    status: job.cancelled_from ?? "QUOTE_SENT",
    cancelled_from: null,
    cancelled_at: null,
    cancel_reason: null,
  });
}

export async function markPaid(id: string): Promise<Job> {
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
