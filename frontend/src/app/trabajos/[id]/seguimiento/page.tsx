"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Eye, Loader2, RotateCcw, Send, Sparkles } from "lucide-react";
import { PageHeader, Screen, SuccessScreen, Title, btnLime, btnPrimary } from "@/components/ui";
import { firstName, getJob, jobTotal, money, sendMessage, type Job } from "@/lib/api";
import { DEMO_BUSINESS, loadBusiness } from "@/lib/business";
import { useLang } from "@/lib/i18n";
import { followUpMessage } from "@/lib/mano";
import { translateToEnglish } from "@/lib/translate";

type EnState = "ok" | "stale" | "translating" | "pending";

export default function Seguimiento() {
  const { t, lang } = useLang();
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const mano = useRef<{ en: string; es: string }>({ en: "", es: "" }); // what Mano wrote, to restore
  const [es, setEs] = useState(""); // Carlos edits THIS (Spanish)
  const [en, setEn] = useState(""); // what the customer receives
  const [enState, setEnState] = useState<EnState>("ok");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const spanish = lang === "es";

  useEffect(() => {
    getJob(Number(id)).then((j) => {
      if (!j) return;
      const biz = { ...DEMO_BUSINESS, ...loadBusiness() };
      const msg = followUpMessage(j, biz.ownerName || DEMO_BUSINESS.ownerName, biz.businessName || DEMO_BUSINESS.businessName, money(jobTotal(j)));
      mano.current = msg;
      setJob(j);
      setEs(msg.es);
      setEn(msg.en);
    });
  }, [id]);

  if (!job) return <Screen>{null}</Screen>;

  const name = firstName(job.customer_name);

  if (sent) {
    return (
      <SuccessScreen title={t.sentTitle} body={t.sentFollowBody}>
        <Link href="/inicio" className={btnLime}>
          {t.backHome}
        </Link>
      </SuccessScreen>
    );
  }

  // Carlos finished editing the Spanish → update the English the customer will get
  const retranslate = async () => {
    if (enState !== "stale") return;
    if (es.trim() === mano.current.es.trim()) {
      setEn(mano.current.en);
      return setEnState("ok");
    }
    setEnState("translating");
    const out = await translateToEnglish(es);
    if (out) {
      setEn(out);
      setEnState("ok");
    } else setEnState("pending");
  };

  const restore = () => {
    setEs(mano.current.es);
    setEn(mano.current.en);
    setEnState("ok");
  };

  const send = async () => {
    setSending(true);
    await sendMessage(job.id);
    setSent(true);
  };

  const ready = spanish ? enState === "ok" && en.trim() !== "" : en.trim() !== "";

  return (
    <Screen>
      <PageHeader backHref="/inicio" />
      <Title>{t.followTitle(name)}</Title>
      <p className="mt-2 flex items-start gap-2 text-base leading-5">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-forest" strokeWidth={2.5} />
        {t.followBody}
      </p>

      {spanish ? (
        <>
          {/* Carlos edits in Spanish */}
          <textarea
            lang="es"
            value={es}
            onChange={(e) => {
              setEs(e.target.value);
              setEnState("stale");
            }}
            onBlur={retranslate}
            rows={6}
            aria-label={t.followTitle(name)}
            className="mt-6 w-full resize-none rounded-[20px] bg-white p-5 text-base leading-6 outline-none focus:ring-2 focus:ring-forest/60"
          />

          {/* What the customer receives — preview only */}
          {enState === "pending" ? (
            <section className="mt-4 rounded-[14px] bg-flag/15 p-4 text-sm text-ojo-ink">
              <p className="flex items-start gap-2 font-semibold">
                <Eye className="mt-0.5 size-4 shrink-0" strokeWidth={2} /> {t.msgPending}
              </p>
              <p className="mt-1 pl-6 text-xs leading-4 opacity-80">{t.msgPendingDemo}</p>
              <button type="button" onClick={restore} className="mt-3 ml-6 flex items-center gap-1.5 rounded-[10px] bg-white px-3 py-2 text-sm font-bold text-forest">
                <RotateCcw className="size-4" /> {t.restoreMano}
              </button>
            </section>
          ) : (
            <section className={`mt-4 rounded-[14px] border border-black/10 p-4 transition-opacity ${enState === "ok" ? "" : "opacity-50"}`}>
              <p className="font-mono text-[11px] uppercase tracking-[1.2px] text-muted">
                {enState === "translating" ? t.translatingMsg : t.customerGets}
              </p>
              <p lang="en" className="mt-1.5 text-sm leading-5 text-black/75">
                {en}
              </p>
            </section>
          )}
        </>
      ) : (
        // English-speaking owner: the customer's language is his language — edit it directly
        <textarea
          lang="en"
          value={en}
          onChange={(e) => setEn(e.target.value)}
          rows={7}
          className="mt-6 w-full resize-none rounded-[20px] bg-white p-5 text-base leading-6 outline-none focus:ring-2 focus:ring-forest/60"
        />
      )}

      <div className="mt-auto pt-8">
        <button type="button" onClick={send} disabled={!ready || sending} className={btnPrimary}>
          {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" strokeWidth={2.25} />}
          {t.approveSend}
        </button>
      </div>
    </Screen>
  );
}
