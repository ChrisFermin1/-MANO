"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { PageHeader, Screen, Title } from "@/components/ui";
import { getJobs, money, moneySummary, onJobsChange, type Job } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { collectedByMonth, estimatesIn, invoicesIn, paymentsIn, periodRange, toCsv, topClients, type Period } from "@/lib/reports";

const PERIODS: Period[] = ["thisMonth", "lastMonth", "thisYear"];

// How the business is doing. Owed/overdue are "right now"; the rest follows the period picked.
export default function Reportes() {
  const { t } = useLang();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [period, setPeriod] = useState<Period>("thisMonth");

  useEffect(() => {
    getJobs().then(setJobs);
    return onJobsChange(() => void getJobs().then(setJobs));
  }, []);
  if (!jobs) return <Screen>{null}</Screen>;

  const range = periodRange(period);
  const payments = paymentsIn(jobs, range);
  const invoices = invoicesIn(jobs, range);
  const est = estimatesIn(jobs, range);
  const now = moneySummary(jobs);
  const year = new Date().getFullYear();
  const months = collectedByMonth(jobs, year);
  const max = Math.max(1, ...months);
  const thisMonth = new Date().getMonth();
  const top = topClients(jobs, range);
  const collected = payments.reduce((s, p) => s + p.amount, 0);

  // a real download of a CSV the accountant can open in Excel / Google Sheets
  const download = (name: string, csv: string) => {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  const tag = `${range.from}_${range.to}`;

  const stat = (label: string, value: string, tone?: "paid" | "overdue", sub?: string) => (
    <div className="flex flex-col justify-between rounded-[16px] glass p-4 lg:p-5">
      <p className="flex items-center gap-1.5 text-sm text-charcoal/60">
        {tone && <span aria-hidden className={`size-2 rounded-full ${tone === "overdue" ? "bg-overdue-ink" : "bg-forest"}`} />}
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${tone === "overdue" ? "text-overdue-ink" : tone === "paid" ? "text-forest" : ""}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );

  return (
    <Screen className="lg:max-w-[1100px]!">
      <PageHeader backHref="/inicio" />
      <Title>{t.reportsTitle}</Title>
      <p className="mt-2 text-base leading-6 text-charcoal/70">{t.reportsBody}</p>

      <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className={`flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition ${
              period === p ? "bg-forest text-white" : "border border-black/10 bg-white text-charcoal/75 hover:border-forest/30"
            }`}
          >
            {t.periods[p]}
          </button>
        ))}
      </div>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
        {stat(t.repCollected, money(collected), "paid")}
        {stat(t.repBilled, money(invoices.reduce((s, i) => s + i.total, 0)))}
        {stat(t.repOwedNow, money(now.owed))}
        {stat(t.repOverdueNow, money(now.overdue), now.overdue > 0 ? "overdue" : undefined)}
      </section>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-12 lg:gap-6">
        {/* money in, month by month (this year), the current month in green */}
        <section className="rounded-[20px] glass p-5 lg:col-span-7">
          <h2 className="text-sm font-semibold">{t.repByMonth(year)}</h2>
          <div className="mt-4 flex h-40 items-end gap-1.5" role="img" aria-label={t.repByMonth(year)}>
            {months.map((v, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${t.monthsShort[i]} · ${money(v)}`}>
                <div className={`w-full rounded-t-[4px] ${i === thisMonth ? "bg-forest" : "bg-sage"}`} style={{ height: `${v > 0 ? Math.max(4, (v / max) * 100) : 0}%` }} />
                <span className={`text-[11px] ${i === thisMonth ? "font-bold text-forest" : "text-muted"}`}>{t.monthsShort[i]}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-4 lg:col-span-5">
          <section className="rounded-[20px] glass p-5">
            <h2 className="text-sm font-semibold">{t.repEstimates}</h2>
            <p className="mt-2 text-base">{t.repEstimatesLine(est.sent, est.approved)}</p>
            {est.sent > 0 && <p className="mt-1 text-sm text-muted">{t.repApprovalRate(Math.round((est.approved / est.sent) * 100))} · {money(est.sentTotal)}</p>}
          </section>

          <section className="rounded-[20px] glass p-5">
            <h2 className="text-sm font-semibold">{t.repTopClients}</h2>
            {top.length ? (
              <ol className="mt-3 space-y-2 text-sm">
                {top.map((c, i) => (
                  <li key={c.client} className="flex items-center gap-3">
                    <span className="w-4 text-muted tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{c.client}</span>
                    <span className="font-bold tabular-nums">{money(c.amount)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-muted">{t.repNoPayments}</p>
            )}
          </section>
        </div>
      </div>

      {/* for the accountant: the period's payments and invoices as spreadsheets */}
      <section className="mt-6 rounded-[20px] glass p-5">
        <h2 className="text-sm font-semibold">{t.repExport}</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() =>
              download(
                `mano-pagos-${tag}.csv`,
                toCsv(t.csvPayments, payments.map((p) => [p.date, p.client, p.invoice, p.method === "—" ? "—" : t.payMethods[p.method], p.amount.toFixed(2)])),
              )
            }
            className="flex h-11 items-center justify-center gap-2 rounded-[12px] border border-forest/25 bg-white px-4 text-sm font-bold text-forest"
          >
            <Download className="size-4" strokeWidth={2.25} /> {t.repExportPayments}
          </button>
          <button
            type="button"
            onClick={() =>
              download(
                `mano-facturas-${tag}.csv`,
                toCsv(t.csvInvoices, invoices.map((i) => [i.date, i.number, i.client, i.total.toFixed(2), i.paid ? t.yes : t.no])),
              )
            }
            className="flex h-11 items-center justify-center gap-2 rounded-[12px] border border-forest/25 bg-white px-4 text-sm font-bold text-forest"
          >
            <Download className="size-4" strokeWidth={2.25} /> {t.repExportInvoices}
          </button>
        </div>
      </section>
    </Screen>
  );
}
