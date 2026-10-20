"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Eye, FileText, PartyPopper, Plus, Sparkles, Users } from "lucide-react";
import { firstName, getJobs, onJobsChange, invoiceNo, invoiceState, jobBadge, jobTotal, moneySummary, money, type Job, type JobBadge, isInvoiceJob } from "@/lib/api";
import { DEMO_BUSINESS, loadBusiness, firstNameOf } from "@/lib/business";
import { jobRow } from "@/lib/rows";
import { useLang, type Strings } from "@/lib/i18n";
import { prioritized, type Alert } from "@/lib/ojo";

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
  const router = useRouter();
  const [name, setName] = useState(DEMO_BUSINESS.ownerName);
  const [hour, setHour] = useState<number | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [showAll, setShowAll] = useState(false); // the rest of Ojo's list stays folded under "+N más"

  useEffect(() => {
    setName(firstNameOf(loadBusiness()?.ownerName) || DEMO_BUSINESS.ownerName);
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
        className={`mt-4 w-full py-1 text-center text-sm font-semibold underline-offset-4 hover:underline md:w-auto md:self-start md:text-left ${dark ? "text-white/80" : "text-forest"}`}
      >
        {showAll ? t.showLess : `+${t.nMore(ojoAlerts.length)}`}
      </button>
    );
  const approval = next?.kind === "to_schedule" && next.job.approved_by ? next : null;
  const cash = jobs ? moneySummary(jobs) : null;
  // same rows as the Jobs list (lib/rows.ts); getJobs() is newest first. Phone: 3, desktop: room for 6
  const recentRows = (jobs ?? []).filter((j) => j.status !== "CANCELLED").slice(0, 6).map((j) => jobRow(j, lang));
  const recent = recentRows.slice(0, 3);
  const waiting = (jobs ?? []).filter((j) => j.status === "QUOTE_SENT"); // estimates out, no answer yet

  const ring = "outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";

  return (
    <main className="min-h-dvh bg-mano-light text-charcoal">
      {/* Phone: one column. Tablet: a wider column with the summary as 2 × 2 and the jobs table.
          Desktop: a 12-column grid, 24px gutters both ways. From 1280px: summary on 4 × 3 columns, then next step (5)
          and recent jobs (7), ≈ 1 : 1.4, as close to the golden split as four equal summary cards allow. Below 1280
          (a small laptop) the columns would be too narrow for the table, so it stays 2 × 2 and stacked. */}
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-[25px] pb-[calc(120px+env(safe-area-inset-bottom))] pt-[calc(30px+env(safe-area-inset-top))] md:max-w-[720px] md:px-12 lg:mx-0 lg:min-h-0 lg:max-w-[1100px] lg:pb-16 lg:pt-8">
        {/* desktop: the sidebar has the logo and Tu negocio */}
        <header className="flex items-center justify-between lg:hidden">
          <span className="font-logo text-[32px] leading-none tracking-[-0.96px] text-forest">mano</span>
          <Link
            href="/negocio"
            aria-label={t.openSettings}
            className={`flex size-10 items-center justify-center rounded-full bg-forest text-base font-semibold text-white transition active:scale-95 ${ring}`}
          >
            {name.charAt(0).toUpperCase()}
          </Link>
        </header>

        <h1 className="mt-10 font-serif text-[36px] leading-10 tracking-[-0.72px] lg:mt-0">
          {hour !== null && <>{t.greeting(hour)},</>}
          <br className="md:hidden" />
          <span className="hidden md:inline"> </span>
          <span className="text-forest">{name}!</span>
        </h1>

        {/* tablet + desktop: the numbers that matter. Same card, same order, numbers on one baseline */}
        {jobs && (
          <div className="mt-8 hidden gap-6 md:grid md:grid-cols-2 xl:grid-cols-4">
            <Stat href="/documentos?tab=invoices" label={t.owedTitle} value={money(cash?.owed ?? 0)} ring={ring} />
            <Stat href="/documentos?tab=invoices" label={t.overdueLabel} value={money(cash?.overdue ?? 0)} tone={cash && cash.overdue > 0 ? "overdue" : undefined} ring={ring} />
            <Stat href="/documentos?tab=invoices" label={t.paidThisMonth} value={money(cash?.paidThisMonth ?? 0)} tone="paid" ring={ring} />
            <Stat
              href="/documentos?tab=estimates"
              label={t.waitingAnswer}
              value={String(waiting.length)}
              sub={waiting.length > 0 ? money(waiting.reduce((sum, j) => sum + jobTotal(j), 0)) : undefined}
              ring={ring}
            />
          </div>
        )}

        <div className="xl:mt-6 xl:grid xl:grid-cols-12 xl:items-start xl:gap-6">
          <div className="xl:col-span-5">
            {/* Next action — the ONE thing to do now. Turns into good news when a customer approved. */}
            {next && copy &&
              (approval ? (
                <section key={`ok-${approval.job.id}`} className="mt-8 flex flex-col rounded-[24px] glass-sage p-6 text-forest motion-safe:animate-[pop-in_300ms_ease-out] md:mt-6 md:[box-shadow:none] xl:mt-0">
                  <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[1.44px]">
                    <PartyPopper className="size-5" strokeWidth={2} /> {t.goodNews}
                  </span>
                  <p className="mt-4 font-serif text-[28px] leading-8 tracking-[-0.56px]">{t.approvedHero(firstName(approval.job.customer_name))}</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums">{money(jobTotal(approval.job))}</p>
                  <p className="mt-2 text-sm font-semibold">{t.approvedNext}</p>
                  <Link
                    href={alertHref(approval)}
                    className={`mt-6 flex h-[53px] items-center justify-center gap-2 rounded-[20px] bg-forest text-sm font-bold text-white transition active:scale-[0.98] md:h-12 md:self-start md:rounded-[12px] md:px-6 ${ring}`}
                  >
                    {t.viewJob}
                  </Link>
                  {moreToggle(false)}
                </section>
              ) : (
                <section key={`na-${next.job.id}`} className="mt-8 flex flex-col rounded-[24px] glass-forest p-6 text-white md:mt-6 md:[box-shadow:none] xl:mt-0">
                  <span className="font-mono text-xs uppercase tracking-[1.44px] text-white/80">{t.nextAction}</span>
                  <p className="mt-4 font-serif text-[28px] leading-8 tracking-[-0.56px]">{copy.title}</p>
                  <p className="mt-2 text-sm leading-5 text-white/80">{copy.detail}</p>
                  <Link
                    href={alertHref(next)}
                    className={`mt-6 flex h-[53px] items-center justify-center gap-2 rounded-[20px] bg-white text-sm font-bold text-forest transition active:scale-[0.98] md:h-12 md:self-start md:rounded-[12px] md:px-6 ${ring} focus-visible:ring-white focus-visible:ring-offset-forest`}
                  >
                    {copy.mano && <Sparkles className="size-4" strokeWidth={2.5} />}
                    {copy.cta}
                  </Link>
                  {moreToggle(true)}
                </section>
              ))}

            {/* Ojo — the rest of the list, right under "+N más" when opened; "all clear" when nothing is pending */}
            {jobs && ((showAll && ojoAlerts.length > 0) || !next) && (
              <section className={`${next ? "mt-4 md:mt-6" : "mt-8 md:mt-6 xl:mt-0"} rounded-[20px] glass-peach p-4 md:rounded-[24px] md:p-6 md:[box-shadow:none]`}>
                <div className="flex items-center gap-2">
                  <Eye className="size-6 text-[#b8803f]" strokeWidth={1.75} />
                  <span className="font-mono text-xs font-medium uppercase tracking-[1.44px]">Ojo</span>
                </div>
                <p className="mt-2 text-base font-semibold leading-5">
                  {ojoAlerts.length ? (next ? t.ojoAlso(ojoAlerts.length) : t.ojoAttention(ojoAlerts.length)) : t.allClear}
                </p>
                {ojoAlerts.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {ojoAlerts.map((a) => (
                      <li key={a.job.id}>
                        <Link href={alertHref(a)} className={`flex items-center gap-4 rounded-[14px] bg-white/75 px-4 py-3 transition active:scale-[0.99] ${ring}`}>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-base font-semibold leading-5">{a.job.customer_name || "—"}</span>
                            <span className="block text-sm leading-5">{alertText(a, t)}</span>
                            {a.kind === "no_response" && <span className="block text-xs text-muted">{t.daysAgo(a.days)}</span>}
                          </span>
                          <span className="flex shrink-0 items-center text-sm font-bold text-forest">
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
          </div>

          <div className="xl:col-span-7">
            {/* Money — how much Carlos is owed. Hidden until his first invoice (no wall of $0s for new users). */}
            {cash?.hasInvoices && (
              <Link href="/documentos?tab=invoices" className={`mt-4 block rounded-[20px] glass p-5 transition active:scale-[0.99] md:hidden ${ring}`}>
                <span className="flex items-center justify-between text-sm font-medium text-muted">
                  {t.owedTitle}
                  <ChevronRight className="size-4 text-forest" strokeWidth={2.5} />
                </span>
                <span className="mt-0.5 block text-[40px] font-bold leading-[44px] tabular-nums">{money(cash.owed)}</span>
                <span className="mt-3 flex flex-wrap gap-2 text-sm tabular-nums">
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

            {/* tablet + desktop: recent jobs as a table (same columns as Trabajos, fewer of them) */}
            {recentRows.length > 0 && (
              <section className="mt-6 hidden overflow-hidden rounded-[16px] border border-black/[0.06] bg-white md:block xl:mt-0">
                <div className="flex h-14 items-center justify-between px-6">
                  <h2 className="text-base font-semibold">{t.recentJobs}</h2>
                  <Link href="/trabajos" className={`-mr-2 flex items-center rounded-[8px] px-2 py-1 text-sm font-bold text-forest hover:underline ${ring}`}>
                    {t.seeAll}
                    <ChevronRight className="size-4" strokeWidth={2.5} />
                  </Link>
                </div>
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="border-y border-black/5 bg-ivory/60 font-mono text-[11px] uppercase tracking-[1px] text-muted">
                    <tr>
                      <th scope="col" className="w-[34%] py-2 pl-6 pr-3 font-medium">{t.colClient}</th>
                      <th scope="col" className="px-3 py-2 font-medium">{t.colJob}</th>
                      <th scope="col" className="w-[18%] px-3 py-2 font-medium">{t.colStatus}</th>
                      <th scope="col" className="w-[16%] py-2 pl-3 pr-6 text-right font-medium">{t.colTotal}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRows.map((r) => {
                      const b = jobBadge(r.job);
                      const where = r.place ?? (r.sites > 1 ? t.nSites(r.sites) : null);
                      return (
                        <tr key={r.id} onClick={() => router.push(r.href)} className="h-16 cursor-pointer border-t border-black/5 transition first:border-t-0 hover:bg-ivory/70">
                          <td className="py-3 pl-6 pr-3">
                            {/* the name is the row's link, so the keyboard can open it too */}
                            <Link href={r.href} onClick={(e) => e.stopPropagation()} className={`block truncate rounded-[4px] font-semibold ${ring}`}>
                              {r.client}
                            </Link>
                            {where && <span title={where} className="block truncate text-[13px] leading-5 text-muted">{where}</span>}
                          </td>
                          <td title={r.service} className="truncate px-3 py-3 text-charcoal/75">{r.service}</td>
                          <td className="px-3 py-3">
                            <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${BADGE_STYLE[b]}`}>{t.badge[b]}</span>
                          </td>
                          <td className="whitespace-nowrap py-3 pl-3 pr-6 text-right font-bold tabular-nums">{r.total > 0 ? money(r.total) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}
          </div>
        </div>

        {/* Recent jobs — what's going on with the latest work */}
        {recent.length > 0 && (
          <section className="mt-4 rounded-[20px] glass p-4 md:hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{t.recentJobs}</h2>
              <Link href="/trabajos" className="flex items-center text-sm font-bold text-forest">
                {t.seeAll}
                <ChevronRight className="size-4" strokeWidth={2.5} />
              </Link>
            </div>
            <ul className="mt-2 divide-y divide-black/5">
              {recent.map((r) => {
                const b = jobBadge(r.job);
                const total = r.total;
                return (
                  <li key={r.id}>
                    <Link href={r.href} className="flex items-center gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold leading-5">{r.client}</span>
                        <span className="block truncate text-sm text-muted tabular-nums">
                          {r.subtitle}
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

        {/* phone + tablet: the other lists (desktop: in the sidebar) */}
        {jobs && (
          <div className="mt-4 grid gap-4 md:mt-6 md:grid-cols-2 md:gap-6 lg:hidden">
            <Link href="/documentos" className={`flex items-center gap-3 rounded-[20px] glass px-5 py-4 transition active:scale-[0.99] ${ring}`}>
              <FileText className="size-5 text-forest" strokeWidth={2} />
              <span className="flex-1 text-base font-semibold">{t.docsTitle}</span>
              <ChevronRight className="size-4 text-forest" strokeWidth={2.5} />
            </Link>
            <Link href="/clientes" className={`flex items-center gap-3 rounded-[20px] glass px-5 py-4 transition active:scale-[0.99] ${ring}`}>
              <Users className="size-5 text-forest" strokeWidth={2} />
              <span className="flex-1 text-base font-semibold">{t.clientsTitle}</span>
              <ChevronRight className="size-4 text-forest" strokeWidth={2.5} />
            </Link>
          </div>
        )}
      </div>

      {/* Primary action, always reachable (desktop: it's in the sidebar) */}
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-ivory from-55% to-transparent pb-[max(24px,env(safe-area-inset-bottom))] pt-8 lg:hidden">
        <div className="mx-auto max-w-[430px] px-[25px] md:max-w-[720px] md:px-12">
          {/* one button; the next screen asks "Estimado o Factura?" with nothing pre-selected, so it can't be forgotten */}
          <Link
            href="/trabajos/nuevo"
            className={`flex h-[60px] items-center justify-center gap-2 rounded-[20px] bg-forest text-base font-bold text-white shadow-lg shadow-forest/20 transition active:scale-[0.98] ${ring}`}
          >
            <Plus className="size-5" strokeWidth={2.75} />
            {t.newJob}
          </Link>
        </div>
      </div>
    </main>
  );
}

// One summary number: label on top, value underneath. Color only means something: red = overdue, green = paid.
function Stat({ href, label, value, sub, tone, ring }: { href: string; label: string; value: string; sub?: string; tone?: "overdue" | "paid"; ring: string }) {
  const ink = tone === "overdue" ? "text-overdue-ink" : tone === "paid" ? "text-forest" : "";
  return (
    <Link href={href} className={`flex flex-col justify-between rounded-[16px] border border-black/[0.06] bg-white p-6 transition hover:border-forest/30 ${ring}`}>
      <span className="flex items-center gap-2 text-sm leading-5 text-charcoal/60">
        {tone && <span aria-hidden className={`size-2 rounded-full ${tone === "overdue" ? "bg-overdue-ink" : "bg-forest"}`} />}
        {label}
      </span>
      <span className="mt-4 flex items-baseline gap-2">
        <span className={`text-[28px] font-bold leading-8 tabular-nums ${ink}`}>{value}</span>
        {sub && <span className="text-sm text-muted tabular-nums">{sub}</span>}
      </span>
    </Link>
  );
}
