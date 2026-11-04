// Reports: what came in, what was billed, how estimates did, for a period. Pure functions over the jobs, so the
// same math runs on the server later. Dates are compared as local days ("2026-10-08").

import { balanceDue, invoiceNo, jobTotal, type Job, type PaymentMethod } from "@/lib/api";

export type Period = "thisMonth" | "lastMonth" | "thisYear";
export type Range = { from: string; to: string }; // inclusive local days

const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** An ISO timestamp → its local day; a plain "2026-10-08" stays as it is. */
export const toDay = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : day(new Date(iso)));
const inRange = (iso: string | null | undefined, r: Range) => !!iso && toDay(iso) >= r.from && toDay(iso) <= r.to;

export function periodRange(p: Period, now = new Date()): Range {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (p === "thisMonth") return { from: day(new Date(y, m, 1)), to: day(new Date(y, m + 1, 0)) };
  if (p === "lastMonth") return { from: day(new Date(y, m - 1, 1)), to: day(new Date(y, m, 0)) };
  return { from: day(new Date(y, 0, 1)), to: day(new Date(y, 11, 31)) };
}

export type PaymentRow = { date: string; client: string; invoice: string; method: PaymentMethod | "—"; amount: number };

/** Every payment received in the range. A job marked paid before payments were recorded counts as one payment. */
export function paymentsIn(jobs: Job[], r: Range): PaymentRow[] {
  const rows: PaymentRow[] = [];
  for (const j of jobs) {
    if (j.status === "CANCELLED") continue;
    const base = { client: j.customer_name?.trim() || "—", invoice: j.invoice_number ? invoiceNo(j.invoice_number) : "—" };
    if (j.payments?.length) {
      for (const p of j.payments) if (inRange(p.date, r)) rows.push({ ...base, date: toDay(p.date), method: p.method, amount: p.amount });
    } else if (j.paid_at && inRange(j.paid_at, r)) {
      rows.push({ ...base, date: toDay(j.paid_at), method: "—", amount: jobTotal(j) });
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export type InvoiceRow = { date: string; number: string; client: string; total: number; paid: boolean };
export function invoicesIn(jobs: Job[], r: Range): InvoiceRow[] {
  return jobs
    .filter((j) => j.invoice_number && j.status !== "CANCELLED" && inRange(j.invoice_sent_at, r))
    .map((j) => ({ date: toDay(j.invoice_sent_at!), number: invoiceNo(j.invoice_number!), client: j.customer_name?.trim() || "—", total: jobTotal(j), paid: !!j.paid_at }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Estimates sent in the range, and how many of those the client approved. */
export function estimatesIn(jobs: Job[], r: Range) {
  const sent = jobs.filter((j) => j.estimate_number && inRange(j.estimate_sent_at, r));
  const approved = sent.filter((j) => !!j.approved_at);
  const sum = (list: Job[]) => Math.round(list.reduce((s, j) => s + jobTotal(j), 0) * 100) / 100;
  return {
    sent: sent.length,
    sentTotal: sum(sent),
    approved: approved.length,
    approvedTotal: sum(approved),
    /** null when nothing was sent (no 0/0) */
    rate: sent.length ? Math.round((approved.length / sent.length) * 100) : null,
  };
}

/** Money still owed on sent invoices AS OF `now` (not a period): not due yet vs past the due date. Partial payments
 *  count (only the balance is owed). Prepared-but-unsent invoices and cancelled jobs are left out. */
export function openInvoices(jobs: Job[], now = new Date()) {
  const pending = { total: 0, count: 0 };
  const overdue = { total: 0, count: 0 };
  for (const j of jobs) {
    if (!j.invoice_number || !j.invoice_sent_at || j.paid_at || j.status === "CANCELLED") continue;
    const owed = balanceDue(j);
    if (owed <= 0) continue;
    const late = !!j.invoice_due_at && new Date(j.invoice_due_at) < now;
    const bucket = late ? overdue : pending;
    bucket.total += owed;
    bucket.count += 1;
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return { pending: { ...pending, total: r(pending.total) }, overdue: { ...overdue, total: r(overdue.total) }, total: r(pending.total + overdue.total) };
}

export type Bucket = { from: string; to: string; amount: number };
/** Money in for a range in 7-day pieces starting on its first day (a month → 1–7, 8–14, 15–21, 22–28, 29–31). */
export function collectedByWeek(jobs: Job[], r: Range): Bucket[] {
  const buckets: Bucket[] = [];
  const start = new Date(`${r.from}T12:00:00`);
  for (let i = 0; ; i++) {
    const from = day(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 7));
    if (from > r.to) break;
    const end = day(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 7 + 6));
    buckets.push({ from, to: end < r.to ? end : r.to, amount: 0 });
  }
  for (const p of paymentsIn(jobs, r)) {
    const b = buckets.find((x) => p.date >= x.from && p.date <= x.to);
    if (b) b.amount += p.amount;
  }
  return buckets.map((b) => ({ ...b, amount: Math.round(b.amount * 100) / 100 }));
}

/** Money in, month by month, for a year (12 numbers, January first). */
export function collectedByMonth(jobs: Job[], year: number): number[] {
  const months = Array.from({ length: 12 }, () => 0);
  for (const p of paymentsIn(jobs, { from: `${year}-01-01`, to: `${year}-12-31` })) months[Number(p.date.slice(5, 7)) - 1] += p.amount;
  return months.map((n) => Math.round(n * 100) / 100);
}

/** Who paid the most in the range. */
export function topClients(jobs: Job[], r: Range, n = 5) {
  const by = new Map<string, number>();
  for (const p of paymentsIn(jobs, r)) by.set(p.client, (by.get(p.client) ?? 0) + p.amount);
  return [...by.entries()].map(([client, amount]) => ({ client, amount })).sort((a, b) => b.amount - a.amount).slice(0, n);
}

/** Spreadsheet-safe CSV (quotes, commas, accents; a BOM so Excel reads ñ/á right). */
export function toCsv(header: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
}

const cents = (n: number) => Math.round(n * 100) / 100;

/** Everything the Reportes page and its PDF show, from one place so they never disagree.
 *  Period flows: collected, billed, estimates, chart, top clients. Balances as of `now`: open (pending/overdue). */
export function buildReport(jobs: Job[], period: Period, now = new Date()) {
  const range = periodRange(period, now);
  const payments = paymentsIn(jobs, range);
  const invoices = invoicesIn(jobs, range);
  const byMonth = period === "thisYear";
  const year = Number(range.from.slice(0, 4));
  // the year so far, month by month (no empty future months); a month, week by week
  const buckets: Bucket[] = byMonth
    ? collectedByMonth(jobs, year)
        .slice(0, now.getFullYear() === year ? now.getMonth() + 1 : 12)
        .map((amount, i) => ({ from: day(new Date(year, i, 1)), to: day(new Date(year, i + 1, 0)), amount }))
    : collectedByWeek(jobs, range);
  return {
    period,
    range,
    today: day(now),
    payments,
    invoices,
    collected: cents(payments.reduce((s, p) => s + p.amount, 0)),
    billed: cents(invoices.reduce((s, i) => s + i.total, 0)),
    open: openInvoices(jobs, now),
    estimates: estimatesIn(jobs, range),
    byMonth,
    buckets,
    top: topClients(jobs, range),
  };
}
export type Report = ReturnType<typeof buildReport>;
