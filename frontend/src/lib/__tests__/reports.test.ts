import { describe, expect, it } from "vitest";
import type { Job } from "@/lib/api";
import { buildReport, collectedByMonth, collectedByWeek, estimatesIn, invoicesIn, openInvoices, paymentsIn, periodRange, toCsv, topClients } from "@/lib/reports";

const job = (over: Partial<Job>): Job =>
  ({ id: 1, customer_name: "Ana", status: "PAYMENT_PENDING", line_items: [{ id: "a", description: "x", amount: 1000 }], ...over }) as Job;
const pay = (amount: number, date: string) => ({ id: date + amount, amount, method: "zelle" as const, date });

describe("periods", () => {
  const now = new Date(2026, 9, 20); // Oct 20, 2026
  it("this month / last month / this year", () => {
    expect(periodRange("thisMonth", now)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodRange("lastMonth", now)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(periodRange("thisYear", now)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
  it("last month in January is December of last year", () => {
    expect(periodRange("lastMonth", new Date(2026, 0, 10))).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });
});

describe("money in", () => {
  const oct = { from: "2026-10-01", to: "2026-10-31" };
  const jobs = [
    job({ id: 1, customer_name: "Ana", invoice_number: 3, payments: [pay(400, "2026-10-05"), pay(100, "2026-09-28")] }),
    job({ id: 2, customer_name: "Luis", invoice_number: 2, paid_at: "2026-10-08T15:00:00", line_items: [{ id: "b", description: "y", amount: 1150 }] }),
    job({ id: 3, customer_name: "Pedro", status: "CANCELLED", payments: [pay(999, "2026-10-09")] }),
  ];
  it("counts payments by their date, old 'paid' jobs once, and never cancelled jobs", () => {
    const rows = paymentsIn(jobs, oct);
    expect(rows.map((r) => [r.client, r.amount])).toEqual([
      ["Ana", 400],
      ["Luis", 1150],
    ]);
    expect(rows[0].invoice).toBe("INV-0003");
  });
  it("adds up per month and per client", () => {
    expect(collectedByMonth(jobs, 2026).slice(8, 10)).toEqual([100, 1550]);
    expect(topClients(jobs, oct)).toEqual([
      { client: "Luis", amount: 1150 },
      { client: "Ana", amount: 400 },
    ]);
  });
});

describe("billed and estimates", () => {
  const oct = { from: "2026-10-01", to: "2026-10-31" };
  it("invoices sent in the period", () => {
    const rows = invoicesIn(
      [
        job({ id: 1, invoice_number: 3, invoice_sent_at: "2026-10-02T12:00:00" }),
        job({ id: 2, invoice_number: 4 }), // prepared, not sent
        job({ id: 3, invoice_number: 1, invoice_sent_at: "2026-09-02T12:00:00" }),
      ],
      oct,
    );
    expect(rows.map((r) => r.number)).toEqual(["INV-0003"]);
  });
  it("estimates sent and approved", () => {
    const r = estimatesIn(
      [
        job({ id: 1, estimate_number: 1, estimate_sent_at: "2026-10-03T12:00:00", approved_at: "2026-10-04T12:00:00" }),
        job({ id: 2, estimate_number: 2, estimate_sent_at: "2026-10-10T12:00:00" }),
        job({ id: 3, estimate_number: 3 }), // not sent
      ],
      oct,
    );
    expect(r).toEqual({ sent: 2, sentTotal: 2000, approved: 1, approvedTotal: 1000, rate: 50 });
  });
  it("no estimates → no rate (never 0/0)", () => {
    expect(estimatesIn([], oct).rate).toBeNull();
  });
});

describe("still owed (as of today)", () => {
  const now = new Date("2026-10-20T12:00:00");
  const sent = { invoice_sent_at: "2026-10-01T12:00:00" };
  it("splits not-due-yet from overdue, counts only the balance, skips unsent / paid / cancelled", () => {
    const r = openInvoices(
      [
        job({ id: 1, invoice_number: 1, ...sent, invoice_due_at: "2026-10-31T23:59:59", payments: [pay(250, "2026-10-05")] }), // pending 750
        job({ id: 2, invoice_number: 2, ...sent, invoice_due_at: "2026-10-15T23:59:59" }), // overdue 1000
        job({ id: 3, invoice_number: 3, invoice_due_at: "2026-10-15T23:59:59" }), // prepared, not sent
        job({ id: 4, invoice_number: 4, ...sent, paid_at: "2026-10-10T12:00:00" }),
        job({ id: 5, invoice_number: 5, ...sent, status: "CANCELLED", invoice_due_at: "2026-10-01T23:59:59" }),
      ],
      now,
    );
    expect(r).toEqual({ pending: { total: 750, count: 1 }, overdue: { total: 1000, count: 1 }, total: 1750 });
  });
  it("due today (end of day) is not overdue yet", () => {
    const r = openInvoices([job({ invoice_number: 1, ...sent, invoice_due_at: "2026-10-20T23:59:59" })], now);
    expect(r.overdue.count).toBe(0);
  });
});

describe("by week", () => {
  it("cuts a month into 7-day pieces and adds payments to the right one", () => {
    const b = collectedByWeek([job({ payments: [pay(100, "2026-10-01"), pay(50, "2026-10-08"), pay(25, "2026-10-31")] })], { from: "2026-10-01", to: "2026-10-31" });
    expect(b.map((x) => [x.from, x.to, x.amount])).toEqual([
      ["2026-10-01", "2026-10-07", 100],
      ["2026-10-08", "2026-10-14", 50],
      ["2026-10-15", "2026-10-21", 0],
      ["2026-10-22", "2026-10-28", 0],
      ["2026-10-29", "2026-10-31", 25],
    ]);
  });
});

describe("the whole report", () => {
  const now = new Date("2026-10-20T12:00:00");
  const jobs = [
    job({ id: 1, invoice_number: 1, invoice_sent_at: "2026-10-02T12:00:00", payments: [pay(300, "2026-10-03"), pay(200, "2026-03-10")] }),
    job({ id: 2, invoice_number: 2, invoice_sent_at: "2026-09-01T12:00:00", paid_at: "2026-10-12T12:00:00" }),
  ];
  it("the chart adds up to Cobrado (month and year)", () => {
    for (const p of ["thisMonth", "lastMonth", "thisYear"] as const) {
      const r = buildReport(jobs, p, now);
      expect(r.buckets.reduce((s, b) => s + b.amount, 0)).toBeCloseTo(r.collected, 2);
    }
    expect(buildReport(jobs, "thisMonth", now).collected).toBe(1300);
    expect(buildReport(jobs, "thisYear", now).collected).toBe(1500);
  });
  it("the year view stops at the current month", () => {
    expect(buildReport(jobs, "thisYear", now).buckets).toHaveLength(10);
  });
  it("billed counts invoices sent in the period, with tax", () => {
    expect(buildReport(jobs, "thisMonth", now).billed).toBe(1000);
    expect(buildReport([job({ invoice_number: 1, invoice_sent_at: "2026-10-02T12:00:00", tax_rate: 10 })], "thisMonth", now).billed).toBe(1100);
  });
});

describe("CSV", () => {
  it("quotes commas and quotes, keeps accents (with a BOM for Excel)", () => {
    const csv = toCsv(["Cliente", "Monto"], [["García, Ana", 950], ['Pedro "el Güero"', 480]]);
    expect(csv).toBe('﻿Cliente,Monto\n"García, Ana",950\n"Pedro ""el Güero""",480');
  });
});
