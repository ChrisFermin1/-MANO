// Reports: what came in, what was billed, how estimates did, for a period. Pure functions over the jobs, so the
// same math runs on the server later. Dates are compared as local days ("2026-10-08").

import { invoiceNo, jobTotal, type Job, type PaymentMethod } from "@/lib/api";

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
  return { sent: sent.length, sentTotal: sent.reduce((s, j) => s + jobTotal(j), 0), approved: approved.length };
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
