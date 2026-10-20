// OJO (mock) — checks for missing info, watches the workflow, picks the next action.
// Person 4's backend logic replaces this; keep the same return shapes.

import { daysSince, isLumpSum, lineAmount, type Job } from "@/lib/api";
import type { Business } from "@/lib/business";
import { CHECKLISTS, checklistFor, type ChecklistItem } from "@/lib/checklists";
import type { TradeId } from "@/lib/i18n";

export type MissingKey = "customer" | "address" | "price" | "items" | "translation";

export function validate(job: Job): MissingKey[] {
  const missing: MissingKey[] = [];
  if (!job.customer_name?.trim()) missing.push("customer");
  // several houses: each line has its own address, so the job doesn't need one
  if (!job.address?.trim() && !job.line_items.some((i) => i.site?.trim())) missing.push("address");
  const blank = (i: Job["line_items"][number]) => !i.description.trim() && !i.description_es?.trim();
  if (!job.line_items.length || job.line_items.some(blank)) missing.push("items");
  // priced either per item (one amount, or quantity × unit price), or with one total for the whole job
  if (isLumpSum(job) ? !(job.job_total! > 0) : job.line_items.some((i) => !blank(i) && lineAmount(i) == null)) missing.push("price");
  // never send a customer an estimate with a line Mano couldn't put into English
  if (job.line_items.some((i) => !blank(i) && (i.translation_pending || !i.description.trim()))) missing.push("translation");
  return missing;
}

// "Did you forget to charge for…?" — from the checklists of the trades Carlos picked on Paso 1
export type Suggestion = { key: string; es: string; en: string; item: string; item_es: string };

type BuiltInTrade = Exclude<TradeId, "other">;

// The job's own type (the label Mano puts on it: "Interior Painting", "Hardscapes", "Auto Repair") decides
// first. Loose words in the note don't: "two coats of sealer" on a patio is not a painting job, and a
// "retaining wall" is not drywall.
const JOB_TYPE: Record<BuiltInTrade, RegExp> = {
  painting: /paint|pintur/i,
  drywall: /drywall|tablaroca|sheetrock/i,
  flooring: /floor|piso|tile|azulejo|laminate|laminado|vinyl|vinil/i,
  bathKitchen: /bath|baño|cabinet|gabinete|countertop|vanity|plumb|plomer|kitchen remodel|remodelación de cocina/i,
  remodel: /remodel|renovat/i,
};
const isGeneral = (job: Job) => !job.service?.trim() || /^general$/i.test(job.service.trim());

function involvedChecklist(job: Job, business: Pick<Business, "trades"> | null) {
  const text = `${job.description} ${job.line_items.map((i) => `${i.description} ${i.description_es ?? ""}`).join(" ")}`;
  // His trades (or all, if he skipped Paso 1) that this job's words mention
  const mine = (business?.trades?.length ? business.trades : (Object.keys(CHECKLISTS) as TradeId[])).filter(
    (t): t is BuiltInTrade => t !== "other",
  );
  const mentioned = mine.filter((t) => CHECKLISTS[t].detect.test(text));
  if (isGeneral(job)) return { text, items: checklistFor(mentioned) }; // type unclear: words only, as before
  const label = `${job.service} ${job.service_es ?? ""}`;
  const byType = (Object.keys(JOB_TYPE) as BuiltInTrade[]).filter((t) => JOB_TYPE[t].test(label));
  // A built-in trade's job (plus his other trades it mentions, e.g. a crack on a painting job).
  // Any other job type (hardscapes, auto repair, junk removal): no built-in checklist → Gemini's questions.
  return { text, items: byType.length ? checklistFor([...new Set([...byType, ...mentioned])]) : [] };
}

/** What Ojo tells Gemini this job is: the job's own type, or the business's trade when it's unclear. */
export function ojoTradeFor(job: Job, business: Pick<Business, "trades" | "otherTrade"> | null, tradeNames: Record<TradeId, string>) {
  if (!isGeneral(job)) return job.service;
  return business?.otherTrade?.name || (business?.trades ?? []).map((id) => tradeNames[id]).join(", ");
}

export function suggestions(job: Job, business: Pick<Business, "trades" | "ojoIgnore"> | null): Suggestion[] {
  const { text, items } = involvedChecklist(job, business);
  const skip = new Set([...(business?.ojoIgnore ?? []), ...(job.ojo_dismissed ?? [])]);
  if (!items.length) {
    // No built-in checklist covers this job (auto repair, roofing…): use Gemini's questions, if any
    const onEstimate = new Set(job.line_items.flatMap((i) => [i.description, i.description_es ?? ""]).map((s) => s.trim().toLowerCase()));
    return (job.ojo_ai ?? []).filter((q) => !skip.has(q.key) && !onEstimate.has(q.item.toLowerCase()) && !onEstimate.has(q.item_es.toLowerCase()));
  }
  return items
    .filter((c) => !skip.has(c.key) && !c.mentioned.test(text)) // already said or already on the estimate
    .map((c) => ({ key: c.key, es: c.ask.es, en: c.ask.en, item: c.item, item_es: c.item_es }));
}

/** True when none of the built-in checklists covers this job, so Ojo asks Gemini instead. */
export const needsAiQuestions = (job: Job, business: Pick<Business, "trades"> | null) => involvedChecklist(job, business).items.length === 0;

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

/** Everything that needs Carlos, most important first (same order as the next action), oldest first within a kind. */
export function prioritized(jobs: Job[]): Alert[] {
  return alerts(jobs).sort(
    (a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind) || a.job.updated_at.localeCompare(b.job.updated_at),
  );
}

export function nextAction(jobs: Job[]): Alert | null {
  return prioritized(jobs)[0] ?? null;
}

