"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Pencil, Send } from "lucide-react";
import { DocLangSwitch, DocumentCard } from "@/components/document";
import { ShareEstimate } from "@/components/share-estimate";
import { PageHeader, Screen, SuccessScreen, Title, btnGhost, btnPrimary } from "@/components/ui";
import { estimateNo, firstName, getJob, sendEstimate, type Job } from "@/lib/api";
import { DEMO_BUSINESS, loadBusiness, type Business } from "@/lib/business";
import { useLang } from "@/lib/i18n";
import { validate } from "@/lib/ojo";

export default function Estimado() {
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
        body={`${job.estimate_number ? `${estimateNo(job.estimate_number)} · ` : ""}${t.sentQuoteBody(firstName(job.customer_name))}`}
      >
        <ShareEstimate job={job} dark />
        <Link href="/inicio" className="mt-4 flex h-[48px] w-full items-center justify-center rounded-[20px] text-sm font-semibold text-lime">
          {t.backHome}
        </Link>
      </SuccessScreen>
    );
  }

  const draft = job.status === "READY_FOR_QUOTE" || job.status === "NEEDS_INFORMATION";
  const ready = validate(job).length === 0;

  const approve = async () => {
    setSending(true);
    setJob(await sendEstimate(job.id));
    setSent(true);
  };

  return (
    <Screen>
      <PageHeader backHref={`/trabajos/${job.id}`} />
      <Title>{t.quoteTitle}</Title>
      <p className="mt-2 text-base leading-5">{t.quoteBody}</p>

      <div className="mt-6 space-y-3">
        {/* Spanish-speaking owner: read it in Spanish, or flip to what the customer actually gets */}
        {lang === "es" && <DocLangSwitch view={docView} onChange={setDocView} labels={{ es: t.docViewEs, en: t.docViewEn }} />}
        <DocumentCard kind="estimate" job={job} biz={biz} view={lang === "es" ? docView : "en"} />
      </div>

      {draft && (
        <div className="mt-auto space-y-1 pt-8">
          <button type="button" onClick={approve} disabled={!ready || sending} className={btnPrimary}>
            {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" strokeWidth={2.25} />}
            {t.approveSend}
          </button>
          <Link href={`/trabajos/${job.id}`} className={btnGhost}>
            <Pencil className="size-4" /> {t.edit}
          </Link>
        </div>
      )}
    </Screen>
  );
}
