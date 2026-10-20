import { balanceDue, defaultDue, dueDay, estimateNo, fmtDate, lineAmount, linesBySite, invoiceNo, isLumpSum, jobTotal, money, paidSoFar, quantityLabel, type Job } from "@/lib/api";
import type { Business } from "@/lib/business";
import { formatPhone } from "@/lib/phone";

// Estimate / invoice document. The CUSTOMER always gets `view="en"`.
// Carlos's own preview can switch to `view="es"` to read the same document in Spanish — one language at a time.
/** Everything the document says, in one place: the screen card and the PDF both read it. */
export function docData(kind: "estimate" | "invoice", job: Job, view: "en" | "es" = "en") {
  const isInvoice = kind === "invoice";
  const es = view === "es";
  const L = (en: string, sp: string) => (es ? sp : en);

  // an invoice not made yet shows the number he picked for it (Número de factura on the job)
  const num = isInvoice ? (job.invoice_number ?? job.invoice_number_planned ?? null) : job.estimate_number;
  const label = num ? (isInvoice ? invoiceNo(num) : estimateNo(num)) : L("NOT SENT", "SIN ENVIAR");
  const issued = (isInvoice ? job.invoice_sent_at : job.estimate_sent_at) ?? new Date().toISOString();
  const due = job.invoice_due_at ?? defaultDue();
  // whole days from the invoice date to the due date (0 = due on receipt)
  const dueIn = Math.max(0, Math.round((new Date(dueDay(due)).getTime() - new Date(dueDay(issued)).getTime()) / 86_400_000));
  const validUntil = new Date(new Date(issued).getTime() + 30 * 86_400_000).toISOString();
  const ref = job.estimate_number ? estimateNo(job.estimate_number) : null;

  const terms = isInvoice
    ? job.paid_at
      ? L(`${ref ? `Ref. estimate #${ref}. ` : ""}Thank you for your business!`, `${ref ? `Ref. estimado #${ref}. ` : ""}¡Gracias por su preferencia!`)
      : L(
          `${ref ? `Ref. estimate #${ref}. ` : ""}${dueIn === 0 ? "Payment due on receipt." : `Payment due within ${dueIn} days.`} Thank you for your business!`,
          `${ref ? `Ref. estimado #${ref}. ` : ""}${dueIn === 0 ? "Pago al recibir." : `Pago dentro de ${dueIn} días.`} ¡Gracias por su preferencia!`,
        )
    : L(
        "Estimate valid for 30 days. Includes labor and materials unless noted. Thank you for your business!",
        "Estimado válido por 30 días. Incluye mano de obra y materiales salvo que se indique. ¡Gracias por su preferencia!",
      );

  const partial = isInvoice && !job.paid_at && paidSoFar(job) > 0;
  return {
    isInvoice,
    es,
    L,
    num,
    label,
    title: isInvoice ? L("Invoice", "Factura") : L("Estimate", "Estimado"),
    paidStamp: isInvoice && job.paid_at ? `${L("Paid", "Pagado")} ${fmtDate(job.paid_at, view)}` : null,
    toLabel: isInvoice ? L("Bill to", "Cobrar a") : L("Prepared for", "Para"),
    dateLabel: isInvoice ? L("Invoice date", "Fecha") : L("Date", "Fecha"),
    date: fmtDate(issued, view),
    untilLabel: isInvoice ? L("Due date", "Vence") : L("Valid until", "Válido hasta"),
    until: fmtDate(isInvoice ? due : validUntil, view),
    // one group per house (several sites on one invoice); a normal job is one group with site null
    groups: linesBySite(job.line_items).map((g) => ({
      site: g.site,
      subtotal: isLumpSum(job) ? null : money(g.lines.reduce((s, i) => s + (lineAmount(i) ?? 0), 0)),
      lines: g.lines.map((i) => {
        const amount = lineAmount(i);
        return {
          id: i.id,
          text: es ? i.description_es || i.description : i.description,
          // "450 ft² × $12" under the description; absent when the line is one amount
          detail: isLumpSum(job) ? null : quantityLabel(i),
          // one price for the whole job → the items are the scope; the price is the total below
          price: isLumpSum(job) ? null : amount === 0 ? L("Included", "Incluido") : money(amount ?? 0),
        };
      }),
    })),
    priceNote: isLumpSum(job) ? (es ? job.price_note_es || job.price_note : job.price_note) || null : null,
    // partial payment: total, what came in, what's left
    partial: partial ? { total: money(jobTotal(job)), paidLabel: L("Paid", "Pagado"), paid: money(paidSoFar(job)), dueLabel: L("Balance due", "Saldo pendiente"), due: money(balanceDue(job)) } : null,
    totalLabel: isInvoice ? (job.paid_at ? L("Total paid", "Total pagado") : L("Amount due", "Total a pagar")) : "Total",
    total: money(jobTotal(job)),
    howToPayLabel: L("How to pay", "Cómo pagar"),
    terms,
  };
}

/** "INV-0003 Ana Garcia.pdf" */
export function pdfName(kind: "estimate" | "invoice", job: Job) {
  const d = docData(kind, job);
  const who = (job.customer_name ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^\w ]+/g, "").trim();
  return `${d.num ? d.label : d.title}${who ? ` ${who}` : ""}.pdf`;
}

export function DocumentCard({
  kind,
  job,
  biz,
  view = "en",
}: {
  kind: "estimate" | "invoice";
  job: Job;
  biz: Business;
  view?: "en" | "es";
}) {
  const d = docData(kind, job, view);
  const { isInvoice } = d;

  return (
    <article lang={view} className="glass-paper rounded-[20px] px-5 pb-5 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-logo text-lg leading-none text-forest">{biz.businessName || "MANO"}</p>
          {biz.phone && <p className="mt-1 text-xs text-muted">{formatPhone(biz.phone)}</p>}
          {biz.email && <p className="text-xs text-muted">{biz.email}</p>}
          {isInvoice && biz.address && <p className="text-xs text-muted">{biz.address}</p>}
        </div>
        <div className="text-right">
          <p className="whitespace-nowrap font-mono text-xs font-bold uppercase tracking-[1.44px]">{d.title}</p>
          {d.num ? (
            <p className="mt-1 whitespace-nowrap font-mono text-xs text-charcoal">#{d.label}</p>
          ) : (
            // badge hugs its text (inline-block), so the highlight is centered on the word
            <p className="mt-1">
              <span className="inline-block rounded-[5px] bg-peach px-2 py-0.5 text-center font-mono text-[11px] font-bold uppercase leading-4 tracking-[1px] text-ojo-ink">
                {d.label}
              </span>
            </p>
          )}
          {d.paidStamp && (
            <p className="mt-1.5 inline-block rounded bg-sage px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-[1.5px] text-forest">{d.paidStamp}</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="font-mono uppercase tracking-[1px] text-muted">{d.toLabel}</p>
          <p className="mt-1 text-sm font-semibold">{job.customer_name}</p>
          <p className="text-muted">{job.address}</p>
          {job.customer_email && <p className="text-muted">{job.customer_email}</p>}
        </div>
        <div className="text-right">
          <p className="font-mono uppercase tracking-[1px] text-muted">{d.dateLabel}</p>
          <p className="mt-1 text-sm">{d.date}</p>
          <p className="mt-2 font-mono uppercase tracking-[1px] text-muted">{d.untilLabel}</p>
          <p className="mt-1 text-sm">{d.until}</p>
        </div>
      </div>

      <hr className="mt-5 border-black/10" />
      {d.groups.map((g) => (
        <div key={g.site ?? "-"} className={g.site ? "mt-4 first:mt-3" : "mt-3"}>
          {g.site && (
            // several houses: which one these lines are for, and what that house comes to
            <p className="mb-1.5 flex justify-between gap-3 font-mono text-[11px] uppercase tracking-[1px] text-muted">
              <span>{g.site}</span>
              {g.subtotal && <span>{g.subtotal}</span>}
            </p>
          )}
          <ul className="space-y-2 text-[15px] leading-5">
            {g.lines.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-4">
                <span className="min-w-0">
                  {i.text}
                  {i.detail && <span className="mt-0.5 block text-xs font-normal text-muted">{i.detail}</span>}
                </span>
                {i.price && <span className="shrink-0 font-bold tabular-nums">{i.price}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <hr className="mt-5 border-black/10" />
      {d.priceNote && <p className="mt-3 text-sm text-muted">{d.priceNote}</p>}
      {d.partial ? (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Total</span>
            <span>{d.partial.total}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{d.partial.paidLabel}</span>
            <span>−{d.partial.paid}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm">{d.partial.dueLabel}</span>
            <span className="text-2xl font-bold">{d.partial.due}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm">{d.totalLabel}</span>
          <span className="text-2xl font-bold">{d.total}</span>
        </div>
      )}

      {isInvoice && !job.paid_at && biz.payInfo?.trim() && (
        <div className="mt-5 rounded-[12px] bg-ivory px-3 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[1.2px] text-muted">{d.howToPayLabel}</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-5">{biz.payInfo.trim()}</p>
        </div>
      )}
      <p className="mt-5 text-xs leading-4 text-muted">{d.terms}</p>
    </article>
  );
}

/** Carlos's switch above his preview: read it in Spanish, or see exactly what the customer gets. */
export function DocLangSwitch({
  view,
  onChange,
  labels,
}: {
  view: "en" | "es";
  onChange: (v: "en" | "es") => void;
  labels: { es: string; en: string };
}) {
  return (
    <div role="tablist" className="glass grid grid-cols-2 rounded-[14px] p-1 text-sm font-semibold">
      {(["es", "en"] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={view === v}
          onClick={() => onChange(v)}
          className={`min-h-10 rounded-[10px] px-2 py-1.5 leading-4 transition ${view === v ? "bg-forest text-white" : "text-charcoal/60"}`}
        >
          {labels[v]}
        </button>
      ))}
    </div>
  );
}
