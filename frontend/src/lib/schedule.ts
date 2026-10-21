// When the work happens: a day ("2026-10-24") and, optionally, a time ("09:00"). Dates are local days, not instants.

import type { Job } from "@/lib/api";

const locale = (lang: "es" | "en") => (lang === "es" ? "es-US" : "en-US");
export const localDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "9:00 a. m." / "9:00 AM" */
export function fmtTime(hhmm: string, lang: "es" | "en") {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(locale(lang), { hour: "numeric", minute: "2-digit" });
}
/** "sáb, 24 oct" */
export const fmtDayShort = (day: string, lang: "es" | "en") =>
  localDay(day).toLocaleDateString(locale(lang), { weekday: "short", month: "short", day: "numeric" });
/** "sáb, 24 oct · 9:00 a. m." */
export const whenLabel = (job: Pick<Job, "scheduled_for" | "scheduled_time">, lang: "es" | "en") =>
  job.scheduled_for ? `${fmtDayShort(job.scheduled_for, lang)}${job.scheduled_time ? ` · ${fmtTime(job.scheduled_time, lang)}` : ""}` : "";

/** Monday of the week that has `d` (contractors plan Monday to Sunday). */
export function weekStart(d: Date) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}
export const weekDays = (start: Date) =>
  Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));

/** The jobs on a day, earliest first (no time = end of the day's list). Cancelled jobs don't show. */
export const jobsOn = (jobs: Job[], day: string) =>
  jobs
    .filter((j) => j.scheduled_for === day && j.status !== "CANCELLED")
    .sort((a, b) => (a.scheduled_time ?? "99").localeCompare(b.scheduled_time ?? "99"));

/** Approved but not given a day yet. */
export const needsDay = (jobs: Job[]) => jobs.filter((j) => j.status === "ACCEPTED" && !j.scheduled_for);
