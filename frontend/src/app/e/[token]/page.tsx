"use client";

// Public estimate page for the HOMEOWNER — opened from a link Carlos shares (WhatsApp/SMS).
// No app, no account. Has its own small EN/ES copy, independent of Carlos's app language.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, MessageCircle, Phone } from "lucide-react";
import { DocumentCard } from "@/components/document";
import { approveEstimate, fmtDate, getJobByToken, type Job } from "@/lib/api";
import { DEMO_BUSINESS, loadBusiness, type Business } from "@/lib/business";

const copy = {
  en: {
    hi: (n: string) => `Hi ${n},`,
    intro: "Here's your estimate. Review it and approve it when you're ready.",
    signLabel: "Type your full name to approve",
    approve: "Approve estimate",
    questions: "I have questions",
    call: "Call",
    text: "Text",
    approvedTitle: "Estimate approved",
    approvedBody: (b: string) => `Thank you! ${b} will contact you to schedule the work.`,
    approvedBy: (n: string, d: string) => `Approved by ${n} on ${d}`,
    unavailable: "This estimate is no longer available.",
    notFound: "We couldn't find this estimate. Check the link with your contractor.",
    terms: "By approving, you accept this estimate. Final price may change if the scope of work changes.",
    poweredBy: "Sent with Mano",
  },
  es: {
    hi: (n: string) => `Hola ${n},`,
    intro: "Aquí está tu estimado. Revísalo y apruébalo cuando estés listo.",
    signLabel: "Escribe tu nombre completo para aprobar",
    approve: "Aprobar estimado",
    questions: "Tengo preguntas",
    call: "Llamar",
    text: "Mensaje",
    approvedTitle: "Estimado aprobado",
    approvedBody: (b: string) => `¡Gracias! ${b} te va a contactar para agendar el trabajo.`,
    approvedBy: (n: string, d: string) => `Aprobado por ${n} el ${d}`,
    unavailable: "Este estimado ya no está disponible.",
    notFound: "No encontramos este estimado. Revisa el enlace con tu contratista.",
    terms: "Al aprobar, aceptas este estimado. El precio final puede cambiar si cambia el trabajo.",
    poweredBy: "Enviado con Mano",
  },
};

export default function CustomerEstimate() {
  const { token } = useParams<{ token: string }>();
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [biz, setBiz] = useState<Business>(DEMO_BUSINESS);
  const [lang, setLang] = useState<"en" | "es">("en");
  const [name, setName] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = copy[lang];

  useEffect(() => {
    if (!token) return;
    getJobByToken(token).then((j) => {
      setJob(j);
      if (j?.customer_name) setName(j.customer_name);
    });
    setBiz({ ...DEMO_BUSINESS, ...loadBusiness() });
  }, [token]);

  const approve = async () => {
    if (!token) return;
    setBusy(true);
    setJob(await approveEstimate(token, name));
    setBusy(false);
  };

  const bizName = biz.businessName || DEMO_BUSINESS.businessName;
  const approved = job && job.approved_at && job.status !== "CANCELLED" && job.status !== "QUOTE_SENT";
  const unavailable = job && (job.status === "CANCELLED" || (!approved && job.status !== "QUOTE_SENT"));

  return (
    <main className="min-h-dvh bg-cream text-black">
      <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col px-5 pb-10 pt-6">
        {/* One clean row: who it's from + a compact language switch (the document itself says "Estimate") */}
        <header className="flex items-center justify-between gap-4">
          <p className="min-w-0 truncate font-logo text-xl leading-none text-forest">{bizName}</p>
          <div className="flex shrink-0 rounded-full bg-black/5 p-0.5 text-xs font-bold" role="group" aria-label="Language / Idioma">
            {(["en", "es"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                aria-label={l === "en" ? "English" : "Español"}
                className={`min-h-8 min-w-11 rounded-full px-3 ${lang === l ? "bg-white shadow-sm" : "text-black/50"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        {job === undefined ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-forest" />
          </div>
        ) : job === null ? (
          <p className="mt-16 text-center text-base">{c.notFound}</p>
        ) : (
          <>
            {approved ? (
              <section className="mt-6 rounded-[20px] bg-forest p-5 text-white">
                <CheckCircle2 className="size-8 text-lime" />
                <h1 className="mt-3 font-serif text-[32px] leading-9">{c.approvedTitle}</h1>
                <p className="mt-2 text-sm leading-5 text-white/85">{c.approvedBody(bizName)}</p>
                <p className="mt-3 font-mono text-xs text-lime">{c.approvedBy(job.approved_by ?? "", fmtDate(job.approved_at!, lang))}</p>
              </section>
            ) : unavailable ? (
              <p className="mt-6 rounded-[16px] bg-black/5 p-4 text-sm">{c.unavailable}</p>
            ) : (
              <section className="mt-6">
                <h1 className="font-serif text-[32px] leading-9">{c.hi((job.customer_name ?? "").split(" ")[0])}</h1>
                <p className="mt-2 text-base leading-6 text-black/75">{c.intro}</p>
              </section>
            )}

            <div className="mt-6">
              <DocumentCard kind="estimate" job={job} biz={biz} />
            </div>

            {!approved && !unavailable && (
              <section className="mt-6">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">{c.signLabel}</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="h-[56px] w-full rounded-[16px] bg-white px-4 font-serif text-xl outline-none ring-forest/60 focus:ring-2"
                  />
                </label>
                <button
                  type="button"
                  onClick={approve}
                  disabled={name.trim().length < 2 || busy}
                  className="mt-4 flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-forest text-base font-bold text-lime transition active:scale-[0.98] disabled:opacity-40"
                >
                  {busy ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
                  {c.approve}
                </button>
                <p className="mt-3 text-center text-xs leading-4 text-muted">{c.terms}</p>

                <button
                  type="button"
                  onClick={() => setAsking((a) => !a)}
                  aria-expanded={asking}
                  className="mt-4 flex h-[48px] w-full items-center justify-center gap-2 rounded-[20px] text-sm font-semibold text-forest"
                >
                  <MessageCircle className="size-4" /> {c.questions}
                </button>
                {asking && (
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <a
                      href={biz.phone ? `tel:${biz.phone}` : undefined}
                      aria-disabled={!biz.phone}
                      className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white text-sm font-semibold aria-disabled:opacity-40"
                    >
                      <Phone className="size-4" /> {c.call}
                    </a>
                    <a
                      href={biz.phone ? `sms:${biz.phone}` : undefined}
                      aria-disabled={!biz.phone}
                      className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white text-sm font-semibold aria-disabled:opacity-40"
                    >
                      <MessageCircle className="size-4" /> {c.text}
                    </a>
                  </div>
                )}
              </section>
            )}

            <p className="mt-auto pt-10 text-center font-logo text-sm text-muted">{c.poweredBy}</p>
          </>
        )}
      </div>
    </main>
  );
}
