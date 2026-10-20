"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Eye, FileText, PartyPopper, Plus, Sparkles, Users } from "lucide-react";
import { firstName, getJobs, onJobsChange, invoiceNo, invoiceState, jobBadge, jobTotal, moneySummary, money, type Job, type JobBadge, isInvoiceJob } from "@/lib/api";
import { DEMO_BUSINESS, loadBusiness } from "@/lib/business";
import { useLang, type Strings } from "@/lib/i18n";
import { prioritized, type Alert } from "@/lib/ojo";
import { jobSubtitle } from "@/lib/services";

// Neutral grey for every fact; only "Pagado" is colored (good news). Warnings live in Ojo.
const BADGE_STYLE: Record<JobBadge, string> = {
  unsent: "bg-black/5 text-charcoal/60",
  sent: "bg-black/5 text-charcoal/60",
  accepted: "bg-black/5 text-charcoal/60",
  scheduled: "bg-black/5 text-charcoal/60",
  in_progress: "bg-black/5 text-charcoal/60",
  done: "bg-black/5 text-charcoal/60",
  invoiced: "bg-black/5 text-charcoal/60",
  paid: "bg-sage text-forest",
  cancelled: "bg-black/5 text-charcoal/40",
};

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
      return isInvoiceJob(a.job) ? t.alertReadyInvoice : t.alertReady;
    case "to_schedule":
      return a.job.approved_by ? t.alertApproved : t.alertToSchedule;
  }
}

function alertHref(a: Alert) {
  if (a.kind === "no_response" || a.kind === "payment") return `/trabajos/${a.job.id}/seguimiento`;
  if (a.kind === "ready") return `/trabajos/${a.job.id}/${isInvoiceJob(a.job) ? "factura" : "estimado"}`;
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
      return isInvoiceJob(a.job)
        ? { title: t.naSendInvoice(name), detail: t.naSendInvoiceDetail, cta: t.viewInvoice, mano: false }
        : { title: t.naSendQuote(name), detail: t.naSendQuoteDetail, cta: t.viewQuote, mano: false };
    case "missing":
      return { title: t.naCompleteInfo(name), detail: t.naCompleteInfoDetail(a.missing.map((m) => t.missing[m])), cta: t.complete, mano: false };
    case "to_schedule":
      return { title: t.naSchedule(name), detail: t.naScheduleDetail(a.job.approved_by || name), cta: t.viewJob, mano: false };
  }
}

export default function Inicio() {
  const { t, lang } = useLang();
  const [name, setName] = useState(DEMO_BUSINESS.ownerName);
  const [hour, setHour] = useState<number | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [showAll, setShowAll] = useState(false); // the rest of Ojo's list stays folded under "+N más"

  useEffect(() => {
    setName(loadBusiness()?.ownerName || DEMO_BUSINESS.ownerName);
    setHour(new Date().getHours());
    getJobs().then(setJobs);
    // Live update when the customer approves in another tab (backend version: poll or websocket)
    return onJobsChange(() => void getJobs().then(setJobs));
  }, []);

  // ONE next step on the home screen; everything else, in the same order, folds under "+N más"
  const queue = jobs ? prioritized(jobs) : [];
  const next = queue[0] ?? null;
  const copy = next && actionCopy(next, t);
  const ojoAlerts = queue.slice(1);
  const moreToggle = (dark: boolean) =>
    ojoAlerts.length > 0 && (
      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        aria-expanded={showAll}
        className={`mt-3 w-full py-1 text-center text-sm font-semibold ${dark ? "text-white/80" : "text-forest"}`}
      >
        {showAll ? t.showLess : `+${t.nMore(ojoAlerts.length)}`}
      </button>
    );
  const approval = next?.kind === "to_schedule" && next.job.approved_by ? next : null;
  const cash = jobs ? moneySummary(jobs) : null;
  const recent = (jobs ?? []).filter((j) => j.status !== "CANCELLED").slice(0, 3); // getJobs() is newest first

  return (
    <main className="min-h-dvh bg-mano-light text-charcoal">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-[25px] pb-[calc(120px+env(safe-area-inset-bottom))] pt-[calc(30px+env(safe-area-inset-top))]">
        <header className="flex items-center justify-between">
          <span className="font-logo text-[32px] leading-none tracking-[-0.96px] text-forest">mano</span>
          <Link
            href="/negocio"
            aria-label={t.openSettings}
            className="flex size-10 items-center justify-center rounded-full bg-forest text-base font-semibold text-white transition active:scale-95"
          >
            {name.charAt(0).toUpperCase()}
          </Link>
        </header>

        <h1 className="mt-10 font-serif text-[36px] leading-10 tracking-[-0.72px]">
          {hour !== null && <>{t.greeting(hour)},</>}
          <br />
          <span className="text-forest">{name}!</span>
        </h1>

        {/* Next action — the ONE thing to do now. Turns into good news when a customer approved. */}
        {next && copy &&
          (approval ? (
            <section key={`ok-${approval.job.id}`} className="mt-7 rounded-[24px] glass-sage p-5 text-forest motion-safe:animate-[pop-in_300ms_ease-out]">
              <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[1.44px]">
                <PartyPopper className="size-5" strokeWidth={2} /> {t.goodNews}
              </span>
              <p className="mt-3 font-serif text-[28px] leading-8 tracking-[-0.56px]">{t.approvedHero(firstName(approval.job.customer_name))}</p>
              <p className="mt-1 text-2xl font-bold">{money(jobTotal(approval.job))}</p>
              <p className="mt-2 text-sm font-semibold">{t.approvedNext}</p>
              <Link
                href={alertHref(approval)}
                className="mt-5 flex h-[53px] items-center justify-center gap-2 rounded-[20px] bg-forest text-sm font-bold text-white transition active:scale-[0.98]"
              >
                {t.viewJob}
              </Link>
              {moreToggle(false)}
            </section>
          ) : (
            <section key={`na-${next.job.id}`} className="mt-7 rounded-[20px] glass-forest p-5 text-white">
              <span className="font-mono text-xs uppercase tracking-[1.44px] text-white">{t.nextAction}</span>
              <p className="mt-2 font-serif text-[28px] leading-8 tracking-[-0.56px]">{copy.title}</p>
              <p className="mt-1 text-sm leading-5 text-white/80">{copy.detail}</p>
              <Link
                href={alertHref(next)}
                className="mt-5 flex h-[53px] items-center justify-center gap-2 rounded-[20px] bg-white text-sm font-bold text-forest transition active:scale-[0.98]"
              >
                {copy.mano && <Sparkles className="size-4" strokeWidth={2.5} />}
                {copy.cta}
              </Link>
              {moreToggle(true)}
            </section>
          ))}

        {/* Ojo — the rest of the list, right under "+N más" when opened; "all clear" when nothing is pending */}
        {jobs && ((showAll && ojoAlerts.length > 0) || !next) && (
          <section className={`${next ? "mt-3" : "mt-7"} rounded-[20px] glass-peach p-4`}>
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

        {/* Money — how much Carlos is owed. Hidden until his first invoice (no wall of $0s for new users). */}
        {cash?.hasInvoices && (
          <Link href="/documentos?tab=invoices" className={`mt-4 block rounded-[20px] glass p-5 transition active:scale-[0.99]`}>
            <span className="flex items-center justify-between text-sm font-medium text-muted">
              {t.owedTitle}
              <ChevronRight className="size-4 text-forest" strokeWidth={2.5} />
            </span>
            <span className="mt-0.5 block text-[40px] font-bold leading-[44px]">{money(cash.owed)}</span>
            <span className="mt-3 flex flex-wrap gap-2 text-sm">
              {cash.overdue > 0 && (
                <span className="rounded-full bg-overdue px-3 py-1 font-semibold text-overdue-ink">
                  {t.overdueLabel} {money(cash.overdue)}
                </span>
              )}
              <span className="rounded-full bg-sage px-3 py-1 font-semibold text-forest">
                {t.paidThisMonth} {money(cash.paidThisMonth)}
              </span>
            </span>
          </Link>
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
                const b = jobBadge(j);
                const total = jobTotal(j);
                return (
                  <li key={j.id}>
                    <Link href={`/trabajos/${j.id}`} className="flex items-center gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold leading-5">{j.customer_name || "—"}</span>
                        <span className="block truncate text-sm text-muted">
                          {jobSubtitle(j, lang)}
                          {total > 0 && ` · ${money(total)}`}
                        </span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${BADGE_STYLE[b]}`}>{t.badge[b]}</span>
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
        {jobs && (
          <Link href="/clientes" className="mt-3 flex items-center gap-3 rounded-[20px] glass px-5 py-4 transition active:scale-[0.99]">
            <Users className="size-5 text-forest" strokeWidth={2} />
            <span className="flex-1 text-base font-semibold">{t.clientsTitle}</span>
            <ChevronRight className="size-4 text-forest" strokeWidth={2.5} />
          </Link>
        )}
      </div>

      {/* Primary action, always reachable */}
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-ivory from-55% to-transparent pb-[max(24px,env(safe-area-inset-bottom))] pt-8">
        <div className="mx-auto max-w-[430px] px-[25px]">
          <Link
            href="/trabajos/nuevo"
            className="flex h-[60px] items-center justify-center gap-2 rounded-[20px] bg-forest text-base font-bold text-white shadow-lg shadow-forest/20 transition active:scale-[0.98]"
          >
            <Plus className="size-5" strokeWidth={2.75} />
            {t.newJob}
          </Link>
        </div>
      </div>
    </main>
  );
}
