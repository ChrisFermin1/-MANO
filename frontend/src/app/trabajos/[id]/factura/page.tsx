"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { DocLangSwitch, DocumentCard } from "@/components/document";
import { PageHeader, Screen, SuccessScreen, Title, btnPrimary, btnSecondary } from "@/components/ui";
import { ShareEstimate } from "@/components/share-estimate";
import { canSendInvoice, defaultDue, dueDay, endOfDay, firstName, getJob, invoiceNo, isUnsent, prepareInvoice, setInvoiceDue, type Job } from "@/lib/api";
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

  useEffect(() => {
    getJob(Number(id)).then((j) => {
      setJob(j);
      if (j) setDue(dueDay(j.invoice_due_at ?? defaultDue()));
    });
    setBiz({ ...DEMO_BUSINESS, ...loadBusiness() });
  }, [id]);

  if (!job) return <Screen>{null}</Screen>;

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

  const send = async () => {
    setSending(true);
    setJob(await prepareInvoice(job.id, due));
    setSent(true);
  };

  return (
    <Screen>
      <PageHeader backHref={`/trabajos/${job.id}`} />
      <Title>{t.invoiceTitle}</Title>
      <p className="mt-2 text-base leading-5">{t.invoiceBody}</p>

      <div className="mt-6 space-y-3">
        {/* Spanish-speaking owner: read it in Spanish, or flip to what the customer actually gets */}
        {lang === "es" && <DocLangSwitch view={docView} onChange={setDocView} labels={{ es: t.docViewEs, en: t.docViewEn }} />}
        <DocumentCard kind="invoice" job={due ? { ...job, invoice_due_at: endOfDay(due) } : job} biz={biz} view={lang === "es" ? docView : "en"} />
      </div>

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
          <button type="button" onClick={send} disabled={sending} className={btnPrimary}>
            {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" strokeWidth={2.25} />}
            {t.prepareSend}
          </button>
        </div>
      )}
      {/* Already sent: sending again, mark as paid and follow-up live on the job page — say so */}
      {!canSend && (
        <div className="mt-auto pt-8">
          <Link href={`/trabajos/${job.id}`} className={btnSecondary}>
            <ArrowLeft className="size-5" strokeWidth={2.25} />
            {t.backToJob}
          </Link>
        </div>
      )}
    </Screen>
  );
}
