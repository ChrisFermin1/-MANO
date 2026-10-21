import { describe, expect, it } from "vitest";
import type { Job } from "@/lib/api";
import { collectedByMonth, estimatesIn, invoicesIn, paymentsIn, periodRange, toCsv, topClients } from "@/lib/reports";

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
    expect(r).toEqual({ sent: 2, sentTotal: 2000, approved: 1 });
  });
});

describe("CSV", () => {
  it("quotes commas and quotes, keeps accents (with a BOM for Excel)", () => {
    const csv = toCsv(["Cliente", "Monto"], [["García, Ana", 950], ['Pedro "el Güero"', 480]]);
    expect(csv).toBe('﻿Cliente,Monto\n"García, Ana",950\n"Pedro ""el Güero""",480');
  });
});
