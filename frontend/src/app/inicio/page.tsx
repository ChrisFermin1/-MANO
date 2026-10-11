"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Eye, FileText, PartyPopper, Plus, Sparkles } from "lucide-react";
import { firstName, getJobs, getDemoJobs, missingFieldLabel, onJobsChange, invoiceNo, invoiceState, jobTotal, moneySummary, money, type Job } from "@/lib/api";
import { fetchBusiness } from "@/lib/business";
import { useLang, type Strings } from "@/lib/i18n";
import { alerts, nextAction, type Alert } from "@/lib/ojo";
import { StatusBadge } from "@/components/ui";

function alertText(a: Alert, t: Strings) {
  switch (a.kind) {
    case "missing":
      return t.missingList(a.missing.map((m) => t.missing[m]));
    case "no_response":
      return t.alertNoResponse;
    case "payment": {
      if (!a.job.invoice_number) return t.alertPayment;
      const no = invoiceNo(a.job.invoice_number);
      return invoiceState(a.job) === "overdue" ? t.alertOverdue(no) : t.alertUnpaid(no);
    }
    case "ready":
      return t.alertReady;
    case "to_schedule":
      return a.job.approved_by ? t.alertApproved : t.alertToSchedule;
  }
}

function alertHref(a: Alert) {
  if (a.kind === "no_response" || a.kind === "payment") return `/trabajos/${a.job.id}/seguimiento`;
  if (a.kind === "ready") return `/trabajos/${a.job.id}/estimado`;
  return `/trabajos/${a.job.id}`;
}

function actionCopy(a: Alert, t: Strings) {
  const name = firstName(a.job.customer_name);
  const total = money(jobTotal(a.job));
  switch (a.kind) {
    case "no_response":
      return { title: t.naFollowUp(name), detail: t.naFollowUpDetail(total, a.days), cta: t.letManoHelp, mano: true };
    case "payment":
      return { title: t.naPayment(name), detail: t.naPaymentDetail(total), cta: t.letManoHelp, mano: true };
    case "ready":
      return { title: t.naSendQuote(name), detail: t.naSendQuoteDetail, cta: t.viewQuote, mano: false };
    case "missing":
      return { title: t.naCompleteInfo(name), detail: t.naCompleteInfoDetail(a.missing.map((m) => t.missing[m])), cta: t.complete, mano: false };
    case "to_schedule":
      return { title: t.naSchedule(name), detail: t.naScheduleDetail(a.job.approved_by || name), cta: t.viewJob, mano: false };
  }
}

export default function Inicio() {
  const { t, lang } = useLang();
  const [name, setName] = useState("");
  const [hour, setHour] = useState<number | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);

  const [demoJobs, setDemoJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetchBusiness().then((business) => { if (active) setName(business.ownerName); })
      .catch((e: Error) => { if (active) setError(e.message); });
    setHour(new Date().getHours());
    const refresh = () => getJobs().then((data) => { if (active) setJobs(data); })
      .catch((e: Error) => { if (active) setError(e.message); });
    const refreshDemo = () => getDemoJobs().then((data) => { if (active) setDemoJobs(data); });
    void refresh();
    void refreshDemo();
    const unsubscribe = onJobsChange(() => { void refresh(); void refreshDemo(); });
    return () => { active = false; unsubscribe(); };
  }, []);

  const next = demoJobs.length ? nextAction(demoJobs) : null;
  const copy = next && actionCopy(next, t);
  // One signal per job: whatever is the next action is not repeated in Ojo's list
  const ojoAlerts = alerts(demoJobs).filter((a) => a.job.id !== next?.job.id);
  const approval = next?.kind === "to_schedule" && next.job.approved_by ? next : null;
  const cash = demoJobs.length ? moneySummary(demoJobs) : null;
  const reviewJobs = (jobs ?? []).filter((job) => job.status === "NEEDS_INFORMATION");
  const recent = (jobs ?? []).filter((j) => j.status !== "CANCELLED").slice(0, 3); // getJobs() is newest first

  return (
    <main className="min-h-dvh bg-mano-light text-black">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-[25px] pb-[120px] pt-[30px]">
        <header className="flex items-center justify-between">
          <span className="font-logo text-[32px] leading-none tracking-[-0.96px] text-forest">mano</span>
          <span className="flex size-10 items-center justify-center rounded-full bg-forest text-base font-semibold text-lime">
            {name.charAt(0).toUpperCase()}
          </span>
        </header>

        <h1 className="mt-10 font-serif text-[36px] leading-10 tracking-[-0.72px]">
          {hour !== null && <>{t.greeting(hour)},</>}
          <br />
          <span className="text-forest">{name}!</span>
        </h1>

        {error && <p role="alert" className="mt-5 rounded-[14px] bg-[#fff0ed] p-4 text-sm text-[#8a2a17]">{error}</p>}
        {!jobs && !error && <p role="status" className="mt-5 text-muted">{lang === "es" ? "Cargando trabajos…" : "Loading jobs…"}</p>}
        {jobs?.length === 0 && <p className="mt-5 text-muted">{t.noJobs}</p>}
        {reviewJobs.length > 0 && <section className="mt-7 rounded-[20px] glass-peach p-4">
          <p className="flex items-center gap-2 font-semibold text-ojo-ink"><Eye className="size-5" />{t.review}</p>
          <ul className="mt-3 space-y-2">{reviewJobs.map((job) => <li key={job.job_id}>
            <Link href={`/trabajos/${job.job_id}`} className="flex items-center gap-3 rounded-[14px] bg-white/75 px-4 py-3">
              <span className="min-w-0 flex-1"><span className="block font-semibold">{job.customer_name || "—"}</span>
                <span className="block text-sm">{job.job_title || job.job_description || "—"}</span>
                <span className="block text-xs text-ojo-ink">{job.missing_fields.map((key) => missingFieldLabel(key, lang)).join(" · ")}</span>
              </span><span className="text-sm font-bold text-forest">{t.review}</span><ChevronRight className="size-4 text-forest" />
            </Link>
          </li>)}</ul>
        </section>}
        {demoJobs.length > 0 && <p className="mt-5 text-xs text-muted">{lang === "es" ? "Vista demo: documentos y recomendaciones de ejemplo" : "Demo preview: sample documents and recommendations"}</p>}
        {/* Next action — the ONE thing to do now. Turns into good news when a customer approved. */}
        {next && copy &&
          (approval ? (
            <section key={`ok-${approval.job.id}`} className="mt-7 rounded-[24px] glass-lime p-5 text-forest motion-safe:animate-[pop-in_300ms_ease-out]">
              <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[1.44px]">
                <PartyPopper className="size-5" strokeWidth={2} /> {t.goodNews}
              </span>
              <p className="mt-3 font-serif text-[28px] leading-8 tracking-[-0.56px]">{t.approvedHero(firstName(approval.job.customer_name))}</p>
              <p className="mt-1 text-2xl font-bold">{money(jobTotal(approval.job))}</p>
              <p className="mt-2 text-sm font-semibold">{t.approvedNext}</p>
              <Link
                href={alertHref(approval)}
                className="mt-5 flex h-[53px] items-center justify-center gap-2 rounded-[20px] bg-forest text-sm font-bold text-lime transition active:scale-[0.98]"
              >
                {t.viewJob}
              </Link>
            </section>
          ) : (
            <section key={`na-${next.job.id}`} className="mt-7 rounded-[20px] glass-forest p-5 text-white">
              <span className="font-mono text-xs uppercase tracking-[1.44px] text-lime">{t.nextAction}</span>
              <p className="mt-2 font-serif text-[28px] leading-8 tracking-[-0.56px]">{copy.title}</p>
              <p className="mt-1 text-sm leading-5 text-white/80">{copy.detail}</p>
              <Link
                href={alertHref(next)}
                className="mt-5 flex h-[53px] items-center justify-center gap-2 rounded-[20px] bg-lime text-sm font-bold text-forest transition active:scale-[0.98]"
              >
                {copy.mano && <Sparkles className="size-4" strokeWidth={2.5} />}
                {copy.cta}
              </Link>
            </section>
          ))}

        {/* Money — how much Carlos is owed. Hidden until his first invoice (no wall of $0s for new users). */}
        {cash?.hasInvoices && (
          <Link href="/documentos?tab=invoices" className={`${next ? "mt-4" : "mt-7"} block rounded-[20px] glass p-5 transition active:scale-[0.99]`}>
            <span className="flex items-center justify-between text-sm font-medium text-muted">
              {t.owedTitle}
              <ChevronRight className="size-4 text-forest" strokeWidth={2.5} />
            </span>
            <span className="mt-0.5 block text-[40px] font-bold leading-[44px]">{money(cash.owed)}</span>
            <span className="mt-3 flex flex-wrap gap-2 text-sm">
              {cash.overdue > 0 && (
                <span className="rounded-full bg-[#f6c9c0] px-3 py-1 font-semibold text-[#8a2a17]">
                  {t.overdueLabel} {money(cash.overdue)}
                </span>
              )}
              <span className="rounded-full bg-lime/40 px-3 py-1 font-semibold text-forest">
                {t.paidThisMonth} {money(cash.paidThisMonth)}
              </span>
            </span>
          </Link>
        )}

        {/* Ojo — everything ELSE that needs attention. Hidden when the next action is the only thing pending
            (an Ojo card saying "nothing else" right under an Ojo warning reads like a contradiction). */}
        {demoJobs.length > 0 && (ojoAlerts.length > 0 || !next) && (
          <section className={`${next || cash?.hasInvoices ? "mt-4" : "mt-7"} rounded-[20px] glass-peach p-4`}>
            <div className="flex items-center gap-2">
              <Eye className="size-6 text-[#b8803f]" strokeWidth={1.75} />
              <span className="font-mono text-xs font-medium uppercase tracking-[1.44px]">Ojo</span>
            </div>
            <p className="mt-2 text-base font-semibold leading-5">
              {ojoAlerts.length ? (next ? t.ojoAlso(ojoAlerts.length) : t.ojoAttention(ojoAlerts.length)) : t.allClear}
            </p>
            {ojoAlerts.length > 0 && (
              <ul className="mt-3 space-y-2">
                {ojoAlerts.map((a) => (
                  <li key={a.job.id}>
                    <Link href={alertHref(a)} className="flex items-center gap-3 rounded-[14px] bg-white/75 px-4 py-3 transition active:scale-[0.99]">
                      <span className="flex-1">
                        <span className="block text-base font-semibold leading-5">{a.job.customer_name || "—"}</span>
                        <span className="block text-sm leading-5">{alertText(a, t)}</span>
                        {a.kind === "no_response" && <span className="block text-xs text-muted">{t.daysAgo(a.days)}</span>}
                      </span>
                      <span className="flex items-center text-sm font-bold text-forest">
                        {t.review}
                        <ChevronRight className="size-4" strokeWidth={2.5} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Recent jobs — what's going on with the latest work */}
        {recent.length > 0 && (
          <section className="mt-4 rounded-[20px] glass p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{t.recentJobs}</h2>
              <Link href="/trabajos" className="flex items-center text-sm font-bold text-forest">
                {t.seeAll}
                <ChevronRight className="size-4" strokeWidth={2.5} />
              </Link>
            </div>
            <ul className="mt-2 divide-y divide-black/5">
              {recent.map((j) => {
                return (
                  <li key={j.job_id}>
                    <Link href={`/trabajos/${j.job_id}`} className="flex items-center gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold leading-5">{j.customer_name || "—"}</span>
                        <span className="flex items-baseline gap-1 text-sm text-muted">
                          <span className="truncate">{j.job_title || j.job_description || "—"}</span>
                          {j.job_price !== null && <span className="shrink-0">· {money(j.job_price)}</span>}
                        </span>
                      </span>
                      <StatusBadge status={j.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {jobs && (
          <Link href="/documentos" className="mt-3 flex items-center gap-3 rounded-[20px] glass px-5 py-4 transition active:scale-[0.99]">
            <FileText className="size-5 text-forest" strokeWidth={2} />
            <span className="flex-1 text-base font-semibold">{t.docsTitle}</span>
            <ChevronRight className="size-4 text-forest" strokeWidth={2.5} />
          </Link>
        )}
      </div>

      {/* Primary action, always reachable */}
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[#eef1ea] from-55% to-transparent pb-6 pt-8">
        <div className="mx-auto max-w-[430px] px-[25px]">
          <Link
            href="/trabajos/nuevo"
            className="flex h-[60px] items-center justify-center gap-2 rounded-[20px] bg-forest text-base font-bold text-lime shadow-lg shadow-forest/20 transition active:scale-[0.98]"
          >
            <Plus className="size-5" strokeWidth={2.75} />
            {t.newJob}
          </Link>
        </div>
      </div>
    </main>
  );
}
