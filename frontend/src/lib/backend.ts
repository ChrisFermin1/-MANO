// Josh's backend (FastAPI + Postgres), reached through this app's server at /backend (see next.config.ts).
// The app keeps reading from the browser; every job created with "Nuevo trabajo" is also saved here.

import { jobTotal, isLumpSum, type Job } from "@/lib/api";

// The demo business the backend creates on startup ("Carlos Painting & Drywall")
export const BUSINESS_ID = process.env.NEXT_PUBLIC_MANO_BUSINESS_ID || "00000000-0000-4000-8000-00000000ca71";

// The canonical states the backend knows (technical-design §4). The app's CANCELLED isn't one of them.
const BACKEND_STATES = [
  "NEW", "NEEDS_INFORMATION", "READY_FOR_QUOTE", "QUOTE_SENT", "ACCEPTED",
  "SCHEDULED", "IN_PROGRESS", "COMPLETED", "PAYMENT_PENDING", "PAID",
] as const;
export const isBackendState = (s: string) => (BACKEND_STATES as readonly string[]).includes(s);

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/backend${path}`, {
    method,
    signal: AbortSignal.timeout(10_000),
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw Object.assign(new Error(`${method} ${path} → ${response.status}`), { status: response.status });
  return (response.status === 204 ? null : await response.json()) as T;
}

/** The job as the backend stores it: one total (or the items' sum), and the line items as they are. */
export function backendFields(job: Job) {
  const total = jobTotal(job);
  const lump = isLumpSum(job);
  return {
    description: job.description,
    customer_name: job.customer_name?.trim() || null,
    job_price: total > 0 ? total.toFixed(2) : null,
    job_title: job.service_es || job.service || null,
    job_address: job.address?.trim() || null,
    start_date: job.scheduled_for || null,
    line_items: job.line_items
      .filter((i) => (i.description || i.description_es || "").trim())
      .map((i) => ({
        description: (i.description || i.description_es || "").trim(),
        description_es: i.description_es?.trim() || null,
        amount: lump || i.amount == null ? null : i.amount.toFixed(2),
      })),
  };
}

export const createRemoteJob = (job: Job) => {
  const { start_date: _start, ...fields } = backendFields(job); // a new job isn't scheduled yet
  void _start;
  return call<{ job_id: string; status: string }>("POST", "/jobs", { business_id: BUSINESS_ID, ...fields });
};

// PATCH names the description field job_description (POST calls it description)
export const updateRemoteJob = (backendId: string, job: Job) => {
  const { description, ...rest } = backendFields(job);
  return call<{ status: string }>("PATCH", `/jobs/${backendId}`, { ...rest, job_description: description });
};

export const moveRemoteJob = (backendId: string, status: string) => call<{ status: string }>("POST", `/jobs/${backendId}/status`, { status });

export const deleteRemoteJob = (backendId: string) => call<null>("DELETE", `/jobs/${backendId}`);
