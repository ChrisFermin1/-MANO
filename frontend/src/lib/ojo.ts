// OJO (mock) — checks for missing info, watches the workflow, picks the next action.
// Person 4's backend logic replaces this; keep the same return shapes.

import { daysSince, isLumpSum, type Job } from "@/lib/api";
import type { Business } from "@/lib/business";
import { CHECKLISTS, checklistFor, type ChecklistItem } from "@/lib/checklists";
import type { TradeId } from "@/lib/i18n";

export type MissingKey = "customer" | "address" | "price" | "items" | "translation";

export function validate(job: Job): MissingKey[] {
  const missing: MissingKey[] = [];
  if (!job.customer_name?.trim()) missing.push("customer");
  if (!job.address?.trim()) missing.push("address");
  const blank = (i: Job["line_items"][number]) => !i.description.trim() && !i.description_es?.trim();
  if (!job.line_items.length || job.line_items.some(blank)) missing.push("items");
  // priced either per item, or with one total for the whole job
  if (isLumpSum(job) ? !(job.job_total! > 0) : job.line_items.some((i) => !blank(i) && i.amount == null)) missing.push("price");
  // never send a customer an estimate with a line Mano couldn't put into English
  if (job.line_items.some((i) => !blank(i) && (i.translation_pending || !i.description.trim()))) missing.push("translation");
  return missing;
}

// "Did you forget to charge for…?" — from the checklists of the trades Carlos picked on Paso 1
export type Suggestion = { key: string; es: string; en: string; item: string; item_es: string };

function involvedChecklist(job: Job, business: Pick<Business, "trades"> | null) {
  const text = `${job.description} ${job.line_items.map((i) => `${i.description} ${i.description_es ?? ""}`).join(" ")}`;
  // His trades (or all, if he skipped Paso 1) that this job actually involves
  const mine = (business?.trades?.length ? business.trades : (Object.keys(CHECKLISTS) as TradeId[])).filter(
    (t): t is Exclude<TradeId, "other"> => t !== "other",
  );
  return { text, items: checklistFor(mine.filter((t) => CHECKLISTS[t].detect.test(text))) };
}

export function suggestions(job: Job, business: Pick<Business, "trades" | "ojoIgnore"> | null): Suggestion[] {
  const { text, items } = involvedChecklist(job, business);
  const skip = new Set([...(business?.ojoIgnore ?? []), ...(job.ojo_dismissed ?? [])]);
  return items
    .filter((c) => !skip.has(c.key) && !c.mentioned.test(text)) // already said or already on the estimate
    .map((c) => ({ key: c.key, es: c.ask.es, en: c.ask.en, item: c.item, item_es: c.item_es }));
}

/** Items Ojo would ask about on this job but Carlos said "Ya lo incluyo siempre" — so he can undo it. */
export function silencedFor(job: Job, business: Pick<Business, "trades" | "ojoIgnore"> | null): ChecklistItem[] {
  const ignore = new Set(business?.ojoIgnore ?? []);
  return involvedChecklist(job, business).items.filter((c) => ignore.has(c.key));
}

export type Alert =
  | { job: Job; kind: "missing"; missing: MissingKey[] }
  | { job: Job; kind: "no_response"; days: number }
  | { job: Job; kind: "payment"; days: number }
  | { job: Job; kind: "ready" }
  | { job: Job; kind: "to_schedule" }; // customer accepted (online or by phone) — Carlos needs to set a date

export function alerts(jobs: Job[]): Alert[] {
  const out: Alert[] = [];
  for (const job of jobs) {
    const days = daysSince(job.updated_at);
    if (job.status === "NEEDS_INFORMATION" || job.status === "NEW") out.push({ job, kind: "missing", missing: validate(job) });
    else if (job.status === "READY_FOR_QUOTE") out.push({ job, kind: "ready" });
    else if (job.status === "ACCEPTED") out.push({ job, kind: "to_schedule" });
    else if (job.status === "QUOTE_SENT" && days >= 2) out.push({ job, kind: "no_response", days });
    else if (job.status === "PAYMENT_PENDING") out.push({ job, kind: "payment", days });
  }
  return out;
}

// One clear next step instead of a list of 17 things
const PRIORITY: Alert["kind"][] = ["to_schedule", "no_response", "payment", "ready", "missing"];

export function nextAction(jobs: Job[]): Alert | null {
  const all = alerts(jobs);
  for (const kind of PRIORITY) {
    const match = all.filter((a) => a.kind === kind).sort((a, b) => a.job.updated_at.localeCompare(b.job.updated_at))[0];
    if (match) return match;
  }
  return null;
}

