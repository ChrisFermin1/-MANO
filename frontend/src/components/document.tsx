import { estimateNo, fmtDate, invoiceNo, isLumpSum, jobTotal, money, type Job } from "@/lib/api";
import type { Business } from "@/lib/business";

// Estimate / invoice document. The CUSTOMER always gets `view="en"`.
// Carlos's own preview can switch to `view="es"` to read the same document in Spanish — one language at a time.
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
  const isInvoice = kind === "invoice";
  const es = view === "es";
  const L = (en: string, sp: string) => (es ? sp : en);

  const num = isInvoice ? job.invoice_number : job.estimate_number;
  const label = num ? (isInvoice ? invoiceNo(num) : estimateNo(num)) : L("NOT SENT", "SIN ENVIAR");
  const issued = (isInvoice ? job.invoice_sent_at : job.estimate_sent_at) ?? new Date().toISOString();
  const due = job.invoice_due_at ?? new Date(Date.now() + 15 * 86_400_000).toISOString();
  const validUntil = new Date(new Date(issued).getTime() + 30 * 86_400_000).toISOString();
  const ref = job.estimate_number ? estimateNo(job.estimate_number) : null;

  const terms = isInvoice
    ? L(
        `${ref ? `Ref. estimate #${ref}. ` : ""}Payment due within 15 days. Thank you for your business!`,
        `${ref ? `Ref. estimado #${ref}. ` : ""}Pago dentro de 15 días. ¡Gracias por su preferencia!`,
      )
    : L(
        "Estimate valid for 30 days. Includes labor and materials unless noted. Thank you for your business!",
        "Estimado válido por 30 días. Incluye mano de obra y materiales salvo que se indique. ¡Gracias por su preferencia!",
      );

  return (
    <article lang={view} className="glass-paper rounded-[20px] px-5 pb-5 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-logo text-lg leading-none text-forest">{biz.businessName || "MANO"}</p>
          {biz.phone && <p className="mt-1 text-xs text-muted">{biz.phone}</p>}
        </div>
        <div className="text-right">
          <p className="font-mono text-xs font-bold uppercase tracking-[1.44px]">{isInvoice ? L("Invoice", "Factura") : L("Estimate", "Estimado")}</p>
          {num ? (
            <p className="mt-1 font-mono text-xs text-black">#{label}</p>
          ) : (
            // badge hugs its text (inline-block), so the highlight is centered on the word
            <p className="mt-1">
              <span className="inline-block rounded-[5px] bg-peach px-2 py-0.5 text-center font-mono text-[11px] font-bold uppercase leading-4 tracking-[1px] text-ojo-ink">
                {label}
              </span>
            </p>
          )}
          {isInvoice && job.paid_at && (
            <p className="mt-1.5 inline-block rounded bg-lime px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-[1.5px] text-forest">
              {L("Paid", "Pagado")} {fmtDate(job.paid_at, view)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="font-mono uppercase tracking-[1px] text-muted">{isInvoice ? L("Bill to", "Cobrar a") : L("Prepared for", "Para")}</p>
          <p className="mt-1 text-sm font-semibold">{job.customer_name}</p>
          <p className="text-muted">{job.address}</p>
        </div>
        <div className="text-right">
          <p className="font-mono uppercase tracking-[1px] text-muted">{isInvoice ? L("Invoice date", "Fecha") : L("Date", "Fecha")}</p>
          <p className="mt-1 text-sm">{fmtDate(issued, view)}</p>
          <p className="mt-2 font-mono uppercase tracking-[1px] text-muted">{isInvoice ? L("Due date", "Vence") : L("Valid until", "Válido hasta")}</p>
          <p className="mt-1 text-sm">{fmtDate(isInvoice ? due : validUntil, view)}</p>
        </div>
      </div>

      <hr className="mt-5 border-black/10" />
      <ul className="mt-3 space-y-2 text-[15px] leading-5">
        {job.line_items.map((i) => (
          <li key={i.id} className="flex justify-between gap-4">
            <span>{es ? i.description_es || i.description : i.description}</span>
            {/* one price for the whole job → the items are the scope; the price is the total below */}
            {!isLumpSum(job) && <span className="font-bold">{i.amount === 0 ? L("Included", "Incluido") : money(i.amount ?? 0)}</span>}
          </li>
        ))}
      </ul>
      <hr className="mt-5 border-black/10" />
      {isLumpSum(job) && (es ? job.price_note_es || job.price_note : job.price_note) && (
        <p className="mt-3 text-sm text-muted">{es ? job.price_note_es || job.price_note : job.price_note}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm">{isInvoice ? (job.paid_at ? L("Total paid", "Total pagado") : L("Amount due", "Total a pagar")) : "Total"}</span>
        <span className="text-2xl font-bold">{money(jobTotal(job))}</span>
      </div>

      <p className="mt-5 text-xs leading-4 text-muted">{terms}</p>
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
          className={`min-h-10 rounded-[10px] px-2 py-1.5 leading-4 transition ${view === v ? "bg-forest text-lime" : "text-black/60"}`}
        >
          {labels[v]}
        </button>
      ))}
    </div>
  );
}
