// ── localStorage helpers ───────────────────────────────────────────────────
// Central place for all localStorage reads/writes.
// TODO: swap each function body to call api.* once the FastAPI backend is live.

import type { Job, JobStatus, Alert, NextAction } from "@/lib/types";

const KEY = "mano_jobs";

// ── Status ordering ─────────────────────────────────────────────────────────
export const STATUS_FLOW: JobStatus[] = [
  "new",
  "needs_information",
  "ready_for_quote",
  "quote_sent",
  "accepted",
  "scheduled",
  "in_progress",
  "completed",
  "payment_pending",
  "paid",
];

// "active" = not yet paid/completed
const ACTIVE_STATUSES: JobStatus[] = [
  "new",
  "needs_information",
  "ready_for_quote",
  "quote_sent",
  "accepted",
  "scheduled",
  "in_progress",
];

// ── Reads ────────────────────────────────────────────────────────────────────
export function getJobs(): Job[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Job[];
  } catch {
    return [];
  }
}

export function getJob(id: string): Job | null {
  return getJobs().find((j) => j.id === id) ?? null;
}

// ── Writes ───────────────────────────────────────────────────────────────────
export function saveJobs(jobs: Job[]): void {
  localStorage.setItem(KEY, JSON.stringify(jobs));
}

export function addJob(job: Job): void {
  const existing = getJobs();
  saveJobs([job, ...existing]);
}

export function updateJobStatus(id: string, status: JobStatus): Job | null {
  const jobs = getJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) return null;
  const updated = { ...jobs[idx], status, updated_at: new Date().toISOString() };
  jobs[idx] = updated;
  saveJobs(jobs);
  return updated;
}

// ── Dashboard derived data ────────────────────────────────────────────────────
export function getActiveJobCount(): number {
  return getJobs().filter((j) => ACTIVE_STATUSES.includes(j.status)).length;
}

/**
 * Derive Ojo alerts from jobs in localStorage.
 * Priority order: needs_information → quote_sent (>2 days) → payment_pending
 */
export function deriveAlerts(jobs: Job[]): Alert[] {
  const now = Date.now();
  const alerts: Alert[] = [];

  for (const job of jobs) {
    const ageMs = now - new Date(job.updated_at).getTime();
    const ageDays = Math.floor(ageMs / 86_400_000);
    const ageHours = Math.floor(ageMs / 3_600_000);
    const ageLabel =
      ageDays >= 1 ? `${ageDays} day${ageDays !== 1 ? "s" : ""}` : `${ageHours} hour${ageHours !== 1 ? "s" : ""}`;

    if (job.status === "needs_information") {
      alerts.push({
        id: `alert-${job.id}-missing`,
        kind: "follow_up",
        job,
        message: `Missing info on ${job.title}`,
        age_label: ageLabel,
      });
    } else if (job.status === "quote_sent" && ageDays >= 2) {
      alerts.push({
        id: `alert-${job.id}-quote`,
        kind: "quote_waiting",
        job,
        message: `${job.customer.name} hasn't responded to the quote`,
        age_label: ageLabel,
      });
    } else if (job.status === "payment_pending") {
      alerts.push({
        id: `alert-${job.id}-payment`,
        kind: "payment_due",
        job,
        message: `Payment pending for ${job.title}`,
        age_label: ageLabel,
      });
    }
  }

  // Cap at 3 — show the most urgent first (sorted by age descending)
  return alerts
    .sort((a, b) => new Date(b.job.updated_at).getTime() - new Date(a.job.updated_at).getTime())
    .slice(0, 3);
}

/**
 * Pick the single best next action from all jobs.
 * Priority: needs_information > quote_sent (stale) > payment_pending > scheduled
 */
export function deriveNextAction(jobs: Job[]): NextAction | null {
  const now = Date.now();

  const ranked = jobs
    .filter((j) => ACTIVE_STATUSES.includes(j.status))
    .map((job) => {
      const ageDays = Math.floor((now - new Date(job.updated_at).getTime()) / 86_400_000);
      let priority = 0;
      let label = "";

      if (job.status === "needs_information") {
        priority = 100;
        label = `Complete missing info for ${job.customer.name}`;
      } else if (job.status === "quote_sent" && ageDays >= 2) {
        priority = 90;
        label = `Follow up with ${job.customer.name} — quote sent ${ageDays} days ago`;
      } else if (job.status === "payment_pending") {
        priority = 80;
        label = `Request payment from ${job.customer.name}`;
      } else if (job.status === "accepted") {
        priority = 70;
        label = `Schedule the job for ${job.customer.name}`;
      } else if (job.status === "ready_for_quote") {
        priority = 60;
        label = `Send a quote to ${job.customer.name}`;
      } else if (job.status === "new") {
        priority = 50;
        label = `Review new job from ${job.customer.name}`;
      }

      return { job, priority, label };
    })
    .filter((r) => r.priority > 0)
    .sort((a, b) => b.priority - a.priority);

  if (ranked.length === 0) return null;
  const top = ranked[0];
  return { label: top.label, job_id: top.job.id };
}
