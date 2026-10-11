"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { DocLangSwitch, DocumentCard } from "@/components/document";
import { PageHeader, Screen, SuccessScreen, Title, btnPrimary } from "@/components/ui";
import { ShareEstimate } from "@/components/share-estimate";
import { canSendInvoice, firstName, getJob, invoiceNo, sendInvoice, type Job } from "@/lib/api";
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

  useEffect(() => {
    getJob(Number(id)).then(setJob);
    setBiz({ ...DEMO_BUSINESS, ...loadBusiness() });
  }, [id]);

  if (!job) return <Screen>{null}</Screen>;

  if (sent) {
    return (
      <SuccessScreen
        title={t.sentTitle}
        body={`${job.invoice_number ? `${invoiceNo(job.invoice_number)} · ` : ""}${t.sentInvoiceBody(firstName(job.customer_name))}`}
      >
        <ShareEstimate job={job} dark />
        <Link href="/inicio" className="mt-4 flex h-[48px] w-full items-center justify-center rounded-[20px] text-sm font-semibold text-lime">
          {t.backHome}
        </Link>
      </SuccessScreen>
    );
  }

  // Only a finished job without an invoice yet can be sent
  const canSend = canSendInvoice(job); // after the work, or directly without an estimate

  const send = async () => {
    setSending(true);
    setJob(await sendInvoice(job.id));
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
        <DocumentCard kind="invoice" job={job} biz={biz} view={lang === "es" ? docView : "en"} />
      </div>

      {canSend && (
        <div className="mt-auto pt-8">
          <button type="button" onClick={send} disabled={sending} className={btnPrimary}>
            {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" strokeWidth={2.25} />}
            {t.approveSend}
          </button>
        </div>
      )}
    </Screen>
  );
}
