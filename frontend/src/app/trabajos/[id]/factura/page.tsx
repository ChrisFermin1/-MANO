"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { DocLangSwitch, DocumentCard } from "@/components/document";
import { PageHeader, Screen, SuccessScreen, Title, btnLime, btnPrimary } from "@/components/ui";
import { canSendInvoice, firstName, getJob, isLiveJob, invoiceNo, sendInvoice, type Job } from "@/lib/api";
import { DEMO_BUSINESS, loadBusiness, fetchBusiness, type Business } from "@/lib/business";
import { useLang } from "@/lib/i18n";

export default function Factura() {
  const { t, lang } = useLang();
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [biz, setBiz] = useState<Business>(DEMO_BUSINESS);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [docView, setDocView] = useState<"es" | "en">("es");

  useEffect(() => {
    let active = true;
    getJob(id).then(async (data) => {
      if (!active) return;
      setJob(data);
      if (data && isLiveJob(data)) {
        const business = await fetchBusiness();
        if (active) setBiz(business);
      } else setBiz({ ...DEMO_BUSINESS, ...loadBusiness() });
    }).catch((e: Error) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [id]);

  if (error) return <Screen><PageHeader backHref={`/trabajos/${id}`} /><p role="alert" className="mt-6 text-[#8a2a17]">{error}</p></Screen>;
  if (!job) return <Screen><p role="status">{lang === "es" ? "Cargando…" : "Loading…"}</p></Screen>;

  if (sent) {
    return (
      <SuccessScreen
        title={t.sentTitle}
        body={`${job.invoice_number ? `${invoiceNo(job.invoice_number)} · ` : ""}${t.sentInvoiceBody(firstName(job.customer_name))}`}
      >
        <Link href="/inicio" className={btnLime}>
          {t.backHome}
        </Link>
      </SuccessScreen>
    );
  }

  // Only a finished job without an invoice yet can be sent
  const canSend = !isLiveJob(job) && canSendInvoice(job); // after the work, or directly without an estimate

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

      {isLiveJob(job) && <p className="mt-4 rounded-[14px] glass-peach p-3 text-sm">{lang === "es" ? "Solo vista previa. Guardar y enviar documentos aún no está conectado." : "Preview only. Saving and sending documents is not connected yet."}</p>}
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
