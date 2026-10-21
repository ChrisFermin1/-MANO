import { describe, expect, it, vi, afterEach } from "vitest";
import {
  balanceDue,
  defaultDue,
  dueDay,
  estimateNo,
  invoiceNo,
  invoiceState,
  jobTotal,
  lineAmount,
  money,
  moneySummary,
  paidSoFar,
  priceLine,
  roundMoney,
  type Job,
  type LineItem,
  type Payment,
} from "@/lib/api";

// A job with only what the money math reads; everything else blank.
function job(over: Partial<Job> = {}): Job {
  return {
    id: 1,
    customer_name: "Ana García",
    address: null,
    service: "Interior Painting",
    description: "",
    line_items: [],
    status: "READY_FOR_QUOTE",
    created_at: "2026-10-01T12:00:00.000Z",
    updated_at: "2026-10-01T12:00:00.000Z",
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
    ...over,
  } as Job;
}
const line = (over: Partial<LineItem>): LineItem => ({ id: Math.random().toString(36), description: "x", amount: null, ...over }) as LineItem;
const pay = (amount: number, date = "2026-10-10"): Payment => ({ id: Math.random().toString(36), amount, method: "zelle", date });

afterEach(() => vi.useRealTimers());

describe("rounding and display", () => {
  it("rounds to cents without float drift", () => {
    expect(roundMoney(450 * 12.33)).toBe(5548.5);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1.005)).toBe(1.01);
  });
  it("shows cents only when there are any", () => {
    expect(money(1420)).toBe("$1,420");
    expect(money(1420.5)).toBe("$1,420.50");
    expect(money(0)).toBe("$0");
  });
  it("numbers documents with their prefix", () => {
    expect(invoiceNo(190)).toBe("INV-0190");
    expect(estimateNo(3)).toBe("EST-0003");
  });
});

describe("line amounts", () => {
  it("uses the single amount when there's no quantity", () => {
    expect(lineAmount({ amount: 420 })).toBe(420);
    expect(lineAmount({ amount: null })).toBeNull();
  });
  it("is quantity × unit price when both are set", () => {
    expect(lineAmount({ amount: 999, quantity: 450, unit_price: 12 })).toBe(5400);
  });
  it("has no amount while a measured price is half filled", () => {
    expect(lineAmount({ amount: 999, quantity: 450, unit_price: null })).toBeNull();
  });
  it("keeps amount in step when quantity or unit price change", () => {
    const l = priceLine(line({ quantity: 10, unit_price: 3 }), { quantity: 12 });
    expect(l.amount).toBe(36);
    expect(l.price_source).toBe("manual");
  });
  it("doesn't touch the price on a description-only edit", () => {
    const l = priceLine(line({ amount: 500, price_source: "spoken" }), { description: "Living room" });
    expect(l.amount).toBe(500);
    expect(l.price_source).toBe("spoken");
  });
});

describe("job totals", () => {
  it("adds the lines (single amounts and measured lines)", () => {
    const j = job({ line_items: [line({ amount: 420 }), line({ quantity: 2, unit_price: 265 }), line({ amount: null })] });
    expect(jobTotal(j)).toBe(950);
  });
  it("uses one total for the whole job when there is one", () => {
    expect(jobTotal(job({ job_total: 1400, line_items: [line({ amount: 100 })] }))).toBe(1400);
  });
});

describe("payments", () => {
  const invoice = (over: Partial<Job> = {}) =>
    job({ line_items: [line({ amount: 950 })], invoice_number: 3, invoice_sent_at: "2026-10-01T12:00:00.000Z", ...over });

  it("nothing paid: the whole total is owed", () => {
    expect(paidSoFar(invoice())).toBe(0);
    expect(balanceDue(invoice())).toBe(950);
  });
  it("partial payments add up and leave the rest", () => {
    const j = invoice({ payments: [pay(400), pay(125.5)] });
    expect(paidSoFar(j)).toBe(525.5);
    expect(balanceDue(j)).toBe(424.5);
  });
  it("never owes less than zero (overpaid)", () => {
    expect(balanceDue(invoice({ payments: [pay(1000)] }))).toBe(0);
  });
  it("an old 'paid' job without payment records counts as fully paid", () => {
    expect(paidSoFar(invoice({ paid_at: "2026-10-05T12:00:00.000Z" }))).toBe(950);
  });
});

describe("invoice state", () => {
  const now = new Date("2026-10-20T15:00:00");
  const base = { line_items: [line({ amount: 950 })], invoice_number: 3 };

  it("no invoice yet → null", () => {
    expect(invoiceState(job())).toBeNull();
  });
  it("made but not sent → ready", () => {
    expect(invoiceState(job({ ...base }))).toBe("ready");
  });
  it("sent, before the due date → unpaid", () => {
    vi.useFakeTimers({ now });
    expect(invoiceState(job({ ...base, invoice_sent_at: "2026-10-15T12:00:00Z", invoice_due_at: "2026-10-30T23:59:59" }))).toBe("unpaid");
  });
  it("sent, past the due date → overdue", () => {
    vi.useFakeTimers({ now });
    expect(invoiceState(job({ ...base, invoice_sent_at: "2026-10-01T12:00:00Z", invoice_due_at: "2026-10-16T23:59:59" }))).toBe("overdue");
  });
  it("paid wins over overdue", () => {
    vi.useFakeTimers({ now });
    expect(invoiceState(job({ ...base, invoice_sent_at: "2026-10-01T12:00:00Z", invoice_due_at: "2026-10-02T23:59:59", paid_at: "2026-10-18T12:00:00Z" }))).toBe("paid");
  });
});

describe("due dates", () => {
  it("defaults to the business's terms (15 days when not set)", () => {
    expect(dueDay(defaultDue(new Date("2026-10-01T10:00:00")))).toBe("2026-10-16");
  });
  it("follows Tu negocio's terms", () => {
    localStorage.setItem("mano.business", JSON.stringify({ invoiceDueDays: 0 }));
    expect(dueDay(defaultDue(new Date("2026-10-01T10:00:00")))).toBe("2026-10-01");
    localStorage.setItem("mano.business", JSON.stringify({ invoiceDueDays: 90 }));
    expect(dueDay(defaultDue(new Date("2026-10-01T10:00:00")))).toBe("2026-12-30");
  });
});

describe("Home's money summary", () => {
  it("counts only sent, uncancelled invoices; splits overdue; sums this month's payments", () => {
    vi.useFakeTimers({ now: new Date("2026-10-20T15:00:00") });
    const sent = { invoice_sent_at: "2026-10-01T12:00:00Z" };
    const jobs = [
      job({ id: 1, line_items: [line({ amount: 950 })], invoice_number: 3, ...sent, invoice_due_at: "2026-10-16T23:59:59" }), // overdue 950
      job({ id: 2, line_items: [line({ amount: 480 })], invoice_number: 1, ...sent, invoice_due_at: "2026-11-30T23:59:59", payments: [pay(80), pay(20, "2026-09-28")] }), // owes 380; $20 came last month
      job({ id: 3, line_items: [line({ amount: 1150 })], invoice_number: 2, ...sent, invoice_due_at: "2026-10-10T23:59:59", paid_at: "2026-10-08T12:00:00Z", payments: [pay(1150, "2026-10-08")] }),
      job({ id: 4, line_items: [line({ amount: 700 })], invoice_number: 4 }), // prepared, not sent: not owed yet
      job({ id: 5, line_items: [line({ amount: 300 })], invoice_number: 5, ...sent, status: "CANCELLED" }),
    ];
    const s = moneySummary(jobs);
    expect(s.owed).toBe(1330);
    expect(s.overdue).toBe(950);
    expect(s.paidThisMonth).toBe(1230); // 80 + 1,150 this month; the $20 from September doesn't count
    expect(s.hasInvoices).toBe(true);
  });
});
