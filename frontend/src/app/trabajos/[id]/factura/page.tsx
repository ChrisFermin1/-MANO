"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Loader2, Send } from "lucide-react";
import { DocLangSwitch, DocumentCard } from "@/components/document";
import { PageHeader, Screen, SuccessScreen, Title, btnGhost, btnPrimary, btnSecondary } from "@/components/ui";
import { ShareEstimate } from "@/components/share-estimate";
import { PdfButton } from "@/components/pdf-button";
import { ClientPreview } from "@/components/client-preview";
import {
  canSendInvoice,
  defaultDue,
  dueDay,
  endOfDay,
  firstName,
  getJob,
  invoiceNo,
  invoiceNumberTaken,
  isUnsent,
  peekInvoiceNumber,
  prepareInvoice,
  setInvoiceDue,
  setInvoiceNumber,
  type Job,
} from "@/lib/api";
import { DEMO_BUSINESS, loadBusiness, type Business } from "@/lib/business";
import { useLang } from "@/lib/i18n";

export default function Factura() {
  const { t, lang } = useLang();
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [biz, setBiz] = useState<Business>(DEMO_BUSINESS);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [docView, setDocView] = useState<"es" | "en">("es");
  const [due, setDue] = useState(""); // "2026-10-31": before preparing, the date Carlos picked; after, it saves right away
  const [num, setNum] = useState(""); // invoice number, same idea: picked before preparing, saved right away after
  const [numError, setNumError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    getJob(Number(id)).then((j) => {
      setJob(j);
      if (j) {
        setDue(dueDay(j.invoice_due_at ?? defaultDue()));
        setNum(String(j.invoice_number ?? j.invoice_number_planned ?? peekInvoiceNumber()));
      }
    });
    setBiz({ ...DEMO_BUSINESS, ...loadBusiness() });
  }, [id]);

  if (!job) return <Screen className="lg:max-w-[760px]!">{null}</Screen>;

  if (sent) {
    return (
      <SuccessScreen
        title={isUnsent(job) ? t.readyTitle : t.sentTitle}
        body={`${job.invoice_number ? `${invoiceNo(job.invoice_number)} · ` : ""}${
          isUnsent(job) ? t.readyBody(firstName(job.customer_name)) : t.sentInvoiceBody(firstName(job.customer_name))
        }`}
      >
        <ShareEstimate job={job} dark onSent={setJob} />
        <Link href="/inicio" className="mt-4 flex h-[48px] w-full items-center justify-center rounded-[20px] text-sm font-semibold text-white">
          {t.backHome}
        </Link>
      </SuccessScreen>
    );
  }

  // Only a finished job without an invoice yet can be sent
  const canSend = canSendInvoice(job); // after the work, or directly without an estimate

  // check the number when he leaves the box (or presses Enter); a prepared invoice saves it right away.
  // Returns the number to use, or null if it's taken (error shown).
  const commitNumber = async (): Promise<number | null> => {
    const n = Number(num);
    if (!num || !Number.isInteger(n) || n < 1) {
      const fallback = job.invoice_number ?? job.invoice_number_planned ?? peekInvoiceNumber();
      setNum(String(fallback));
      setNumError(null);
      return fallback;
    }
    if (n === (job.invoice_number ?? job.invoice_number_planned)) {
      setNumError(null);
      return n;
    }
    if (invoiceNumberTaken(n, job.id)) {
      setNumError(t.invoiceNumberTaken(invoiceNo(n)));
      return null;
    }
    setNumError(null);
    setJob(await setInvoiceNumber(job.id, n)); // made: changes it · not made yet: remembered for when it is
    return n;
  };

  const send = async () => {
    const n = await commitNumber();
    if (n == null) return; // taken — stay on the form with the error
    setSending(true);
    try {
      setJob(await prepareInvoice(job.id, due, n));
      setSent(true);
    } finally {
      setSending(false);
    }
  };
  const shownNumber = Number(num) >= 1 && !numError ? Number(num) : job.invoice_number;

  return (
    <Screen className="lg:max-w-[760px]!">
      <PageHeader backHref={`/trabajos/${job.id}`} />
      <Title>{t.invoiceTitle}</Title>
      <p className="mt-2 text-base leading-5">{t.invoiceBody}</p>

      <div className="mt-6 space-y-3">
        {/* Spanish-speaking owner: read it in Spanish, or flip to what the customer actually gets */}
        {lang === "es" && <DocLangSwitch view={docView} onChange={setDocView} labels={{ es: t.docViewEs, en: t.docViewEn }} />}
        <DocumentCard
          kind="invoice"
          job={{ ...job, invoice_number: shownNumber ?? null, ...(due ? { invoice_due_at: endOfDay(due) } : {}) }}
          biz={biz}
          view={lang === "es" ? docView : "en"}
        />
        {/* the link page and the PDF, exactly as the client gets them */}
        <button type="button" onClick={() => setPreviewing(true)} className="flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-forest underline-offset-4 hover:underline">
          <Eye className="size-4" strokeWidth={2.25} /> {t.previewOpen}
        </button>
      </div>
      {previewing && (
        <ClientPreview
          kind="invoice"
          job={{ ...job, invoice_number: shownNumber ?? null, ...(due ? { invoice_due_at: endOfDay(due) } : {}) }}
          biz={biz}
          onClose={() => setPreviewing(false)}
        />
      )}

      {/* invoice number: the next one by default; he can change it (e.g. to keep Wave's numbering) */}
      {(canSend || job.invoice_number) && num && (
        <>
          <label className="mt-4 flex h-[52px] items-center justify-between gap-3 rounded-[14px] glass px-4">
            <span className="text-sm font-semibold">{t.invoiceNumberLabel}</span>
            <span className="flex items-center font-mono text-base font-semibold text-forest">
              INV-
              <input
                value={num}
                onChange={(e) => (setNum(e.target.value.replace(/\D/g, "").slice(0, 6)), setNumError(null))}
                onBlur={() => void commitNumber()}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                inputMode="numeric"
                aria-label={t.invoiceNumberLabel}
                aria-invalid={!!numError}
                style={{ width: `${Math.max(num.length, 1) + 0.5}ch` }} // grows with the number, right next to "INV-"
                className="bg-transparent font-mono outline-none"
              />
            </span>
          </label>
          {numError && (
            <p role="alert" className="mt-2 text-sm font-semibold text-overdue-ink">
              {numError}
            </p>
          )}
        </>
      )}

      {/* due date: his terms by default; a client who asked for more time gets another date */}
      {(canSend || (job.invoice_number && !job.paid_at)) && due && (
        <label className="mt-4 flex h-[52px] items-center justify-between gap-3 rounded-[14px] glass px-4">
          <span className="text-sm font-semibold">{t.dueLabel}</span>
          <input
            type="date"
            value={due}
            min={dueDay(job.invoice_sent_at ?? new Date().toISOString())}
            onChange={async (e) => {
              const v = e.target.value;
              if (!v) return;
              setDue(v);
              if (job.invoice_number) setJob(await setInvoiceDue(job.id, v));
            }}
            className="bg-transparent text-right text-base font-semibold text-forest outline-none"
          />
        </label>
      )}

      {canSend && (
        <div className="mt-auto pt-8">
          <button type="button" onClick={send} disabled={sending || !!numError} className={btnPrimary}>
            {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" strokeWidth={2.25} />}
            {t.prepareSend}
          </button>
        </div>
      )}
      {/* Already sent: sending again, mark as paid and follow-up live on the job page — say so */}
      {!canSend && (
        <div className="mt-auto space-y-1 pt-8">
          {/* the customer's version (English): to print, save or send */}
          <PdfButton
            kind="invoice"
            job={job}
            biz={biz}
            label={t.downloadPdf}
            busyLabel={t.makingPdf}
            errorLabel={t.pdfFailed}
            className={btnSecondary}
          />
          <Link href={`/trabajos/${job.id}`} className={btnGhost}>
            <ArrowLeft className="size-5" strokeWidth={2.25} />
            {t.backToJob}
          </Link>
        </div>
      )}
    </Screen>
  );
}
