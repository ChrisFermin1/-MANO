import { describe, expect, it } from "vitest";
import { highestInvoiceNumber, invoiceNumberTaken, peekInvoiceNumber } from "@/lib/api";

const save = (jobs: object[]) => localStorage.setItem("mano.jobs", JSON.stringify(jobs));

describe("invoice numbering", () => {
  it("starts at 1", () => {
    expect(peekInvoiceNumber()).toBe(1);
  });
  it("is the highest used + 1", () => {
    save([{ id: 1, invoice_number: 3 }, { id: 2, invoice_number: 7 }]);
    expect(peekInvoiceNumber()).toBe(8);
  });
  it("continues from the number set in Tu negocio (e.g. coming from another app at 189)", () => {
    localStorage.setItem("mano.business", JSON.stringify({ nextInvoiceNumber: 190 }));
    save([{ id: 1, invoice_number: 3 }]);
    expect(peekInvoiceNumber()).toBe(190);
  });
  it("never goes below a number already used", () => {
    localStorage.setItem("mano.business", JSON.stringify({ nextInvoiceNumber: 5 }));
    save([{ id: 1, invoice_number: 9 }]);
    expect(peekInvoiceNumber()).toBe(10);
  });
  it("counts numbers reserved on drafts, so two drafts can't both get 190", () => {
    save([{ id: 1, invoice_number: null, invoice_number_planned: 190 }]);
    expect(peekInvoiceNumber()).toBe(191);
    expect(highestInvoiceNumber()).toBe(190);
  });
  it("knows when a number is taken (made or reserved), except by the same job", () => {
    save([
      { id: 1, invoice_number: 4 },
      { id: 2, invoice_number: null, invoice_number_planned: 190 },
      { id: 3, invoice_number: 5, invoice_number_planned: 300 }, // made → its old reservation doesn't count
    ]);
    expect(invoiceNumberTaken(4)).toBe(true);
    expect(invoiceNumberTaken(190)).toBe(true);
    expect(invoiceNumberTaken(190, 2)).toBe(false);
    expect(invoiceNumberTaken(300)).toBe(false);
    expect(invoiceNumberTaken(6)).toBe(false);
  });
});
