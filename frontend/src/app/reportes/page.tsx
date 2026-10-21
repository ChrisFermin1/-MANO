"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import { PageHeader, Screen, Title } from "@/components/ui";
import { RevenueChart, useBucketLabels } from "@/components/revenue-chart";
import { getJobs, money, onJobsChange, type Job } from "@/lib/api";
import { loadBusiness } from "@/lib/business";
import { useLang } from "@/lib/i18n";
import { buildReport, toCsv, type Period, type Report } from "@/lib/reports";

const PERIODS: Period[] = ["thisMonth", "lastMonth", "thisYear"];
const noon = (iso: string) => new Date(`${iso}T12:00:00`);

/** A real download (iPhone asks "Download?" and saves to Files). */
function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// How the business is doing: what came in (Cobrado, the hero), what was billed, and what's still owed.
// Period numbers follow the picker; Pendiente / Vencido are balances as of today. All of it comes from buildReport,
// the same numbers as the PDF.
export default function Reportes() {
  const { t, lang } = useLang();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [period, setPeriod] = useState<Period>("thisMonth");

  const load = () => {
    setFailed(false);
    getJobs()
      .then(setJobs)
      .catch(() => setFailed(true));
  };
  useEffect(() => {
    load();
    return onJobsChange(load);
  }, []);

  const report = jobs ? buildReport(jobs, period) : null;
  const loc = lang === "es" ? "es-US" : "en-US";
  const rangeLabel = report
    ? new Intl.DateTimeFormat(loc, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).formatRange(noon(report.range.from), noon(report.range.to))
    : "";

  return (
    <Screen className="lg:max-w-[1120px]!">
      <PageHeader
        backHref="/inicio"
        right={
          report && (
            <span className="hidden lg:block">
              <ExportActions report={report} rangeLabel={rangeLabel} inline />
            </span>
          )
        }
      />

      {/* title on the left, the period on the right (desktop); stacked on the phone */}
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-8">
        <div>
          <Title>{t.reportsTitle}</Title>
          <p className="mt-2 text-base leading-6 text-charcoal/70">
            {t.reportsBody}
          </p>
        </div>
        <div className="mt-5 lg:mt-0 lg:text-right">
          <div
            role="radiogroup"
            aria-label={t.repPeriodLabel}
            className="flex rounded-[12px] bg-black/[0.05] p-1 lg:inline-flex"
          >
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={period === p}
                onClick={() => setPeriod(p)}
                className={`h-10 flex-1 whitespace-nowrap rounded-[9px] px-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-forest/40 motion-reduce:transition-none lg:h-9 lg:flex-none lg:px-4 ${
                  period === p
                    ? "bg-white text-charcoal shadow-[0_1px_2px_rgba(32,37,34,0.10)]"
                    : "text-charcoal/60 hover:text-charcoal"
                }`}
              >
                {t.periods[p]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-charcoal/55 tabular-nums">
            {rangeLabel || " "}
          </p>
        </div>
      </div>

      {failed ? (
        <div role="alert" className="mt-6 rounded-[20px] glass p-6 text-center">
          <p className="font-semibold">{t.repLoadError}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 text-sm font-bold text-forest underline-offset-4 hover:underline"
          >
            {t.repRetry}
          </button>
        </div>
      ) : !report ? (
        <Skeleton />
      ) : (
        <ReportBody report={report} rangeLabel={rangeLabel} />
      )}
    </Screen>
  );
}

function ReportBody({
  report: r,
  rangeLabel,
}: {
  report: Report;
  rangeLabel: string;
}) {
  const { t } = useLang();
  const when = t.periodIn[r.period];
  const { open, estimates: est } = r;

  return (
    <>
      {/* the money: Cobrado leads; Facturado (period) and Pendiente / Vencido (today) follow, quieter */}
      <section
        aria-label={t.repCollected}
        className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4 xl:grid-cols-5"
      >
        <div className="col-span-2 rounded-[20px] glass p-5 md:col-span-3 lg:p-6 xl:col-span-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-forest">
            <span aria-hidden className="size-2 rounded-full bg-forest" />
            {t.repCollected}
          </p>
          <p className="mt-3 text-[clamp(32px,10vw,44px)] font-semibold leading-none tracking-[-0.02em] tabular-nums">
            {money(r.collected)}
          </p>
          <p className="mt-2.5 text-sm text-charcoal/60">
            {t.repCollectedSub(when)}
          </p>
        </div>
        <Metric
          wide
          className="col-span-2 md:col-span-1"
          label={t.repBilled}
          value={money(r.billed)}
          sub={t.repBilledSub(when)}
        />
        <Metric
          label={t.repPending}
          value={money(open.pending.total)}
          sub={t.repPendingSub}
          dot="bg-pending-ink"
        />
        <Metric
          label={t.repOverdue}
          value={money(open.overdue.total)}
          sub={t.repOverdueSub}
          dot="bg-overdue-ink"
          valueClass={open.overdue.total > 0 ? "text-overdue-ink" : ""}
        />
      </section>
      <p className="mt-2 text-xs text-charcoal/50">{t.repAsOfToday}</p>

      {/* chart ~65% · what's still owed ~35% (stacked below desktop) */}
      <div className="mt-5 grid gap-4 lg:mt-6 xl:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <RevenueChart report={r} />

        <section
          aria-labelledby="owed-title"
          className="rounded-[20px] glass p-5 lg:p-6"
        >
          <h2 id="owed-title" className="text-base font-semibold">
            {t.repToCollect}
          </h2>
          {open.total === 0 ? (
            <p className="mt-3 text-sm text-charcoal/60">{t.repNothingOwed}</p>
          ) : (
            <>
              <p className="mt-3 text-xs text-charcoal/60">
                {t.repToCollectTotal}
              </p>
              <p className="mt-0.5 text-[28px] font-semibold leading-9 tabular-nums">
                {money(open.total)}
              </p>
              <div className="mt-3 border-t border-black/[0.06]" />
              <ul className="-mx-2 mt-2">
                <OwedRow
                  href={open.pending.count ? "/trabajos?f=owed" : null}
                  dot="bg-pending-ink"
                  label={t.repPending}
                  count={t.repInvoices(open.pending.count)}
                  amount={open.pending.total}
                  linkLabel={t.repSeeOwed}
                />
                <OwedRow
                  href={open.overdue.count ? "/trabajos?f=overdue" : null}
                  dot="bg-overdue-ink"
                  label={t.repOverdue}
                  count={t.repInvoices(open.overdue.count)}
                  amount={open.overdue.total}
                  linkLabel={t.repSeeOverdue}
                  overdue
                />
              </ul>
            </>
          )}
        </section>
      </div>

      {/* lighter: how estimates did, who paid the most */}
      <div className="mt-8 grid gap-8 md:grid-cols-2 lg:gap-12">
        <section
          aria-labelledby="est-title"
          className="border-t border-black/[0.08] pt-5"
        >
          <h2 id="est-title" className="text-base font-semibold">
            {t.repEstimates}
          </h2>
          {est.sent === 0 ? (
            <p className="mt-3 text-sm text-charcoal/60">{t.repNoEstimates}</p>
          ) : (
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
              <Small label={t.repSent} value={String(est.sent)} />
              <Small label={t.repApproved} value={String(est.approved)} />
              <Small
                label={t.repRate}
                value={est.rate === null ? "—" : `${est.rate}%`}
              />
              <Small
                label={t.repApprovedValue}
                value={money(est.approvedTotal)}
              />
            </dl>
          )}
        </section>

        <section
          aria-labelledby="top-title"
          className="border-t border-black/[0.08] pt-5"
        >
          <h2 id="top-title" className="text-base font-semibold">
            {t.repTopClients}
          </h2>
          {r.top.length ? (
            <ol className="mt-3">
              {r.top.map((c, i) => (
                <li
                  key={c.client}
                  className="flex items-center gap-3 border-b border-black/[0.05] py-2.5 text-sm last:border-0"
                >
                  <span className="w-4 text-charcoal/40 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {c.client}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {money(c.amount)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-charcoal/60">{t.repNoPayments}</p>
          )}
        </section>
      </div>

      {/* phone / tablet: exports at the end (desktop has them at the top) */}
      <section
        aria-labelledby="export-title"
        className="mt-8 border-t border-black/[0.08] pt-5 lg:hidden"
      >
        <h2 id="export-title" className="text-base font-semibold">
          {t.repExport}
        </h2>
        <div className="mt-3">
          <ExportActions report={r} rangeLabel={rangeLabel} />
        </div>
      </section>
    </>
  );
}

function Metric({
  label,
  value,
  sub,
  dot,
  valueClass = "",
  className = "",
  wide = false,
}: {
  label: string;
  value: string;
  sub: string;
  dot?: string;
  valueClass?: string;
  className?: string;
  /** full width on the phone: label left, amount right */
  wide?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-[16px] glass p-4 lg:p-5 ${wide ? "flex items-center justify-between gap-4 md:block" : ""} ${className}`}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-charcoal/60">
          {dot && (
            <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
          )}
          {label}
        </p>
        <p
          className={`text-xs leading-4 text-charcoal/50 ${wide ? "mt-0.5 md:hidden" : "hidden"}`}
        >
          {sub}
        </p>
      </div>
      <p
        className={`truncate text-[22px] font-semibold leading-7 tabular-nums ${wide ? "md:mt-1.5" : "mt-1.5"} ${valueClass}`}
      >
        {value}
      </p>
      <p
        className={`mt-1 text-xs leading-4 text-charcoal/50 ${wide ? "hidden md:block" : ""}`}
      >
        {sub}
      </p>
    </div>
  );
}

function Small({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-charcoal/55">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function OwedRow({
  href,
  dot,
  label,
  count,
  amount,
  linkLabel,
  overdue,
}: {
  href: string | null;
  dot: string;
  label: string;
  count: string;
  amount: number;
  linkLabel: string;
  overdue?: boolean;
}) {
  const body = (
    <>
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${dot}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-charcoal/55">{count}</span>
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${overdue && amount > 0 ? "text-overdue-ink" : ""}`}
      >
        {money(amount)}
      </span>
      {href && (
        <ChevronRight
          aria-hidden
          className="size-4 text-charcoal/35"
          strokeWidth={2.25}
        />
      )}
    </>
  );
  return (
    <li>
      {href ? (
        <Link
          href={href}
          aria-label={`${linkLabel}: ${money(amount)}, ${count}`}
          className="flex min-h-14 items-center gap-3 rounded-[12px] px-2 outline-none transition hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-forest/40 active:bg-black/[0.05]"
        >
          {body}
        </Link>
      ) : (
        <div className="flex min-h-14 items-center gap-3 px-2">{body}</div>
      )}
    </li>
  );
}

const btnExport =
  "flex h-11 items-center justify-center gap-2 rounded-[12px] border border-black/10 bg-white px-4 text-sm font-semibold text-charcoal outline-none transition hover:border-forest/30 hover:text-forest focus-visible:ring-2 focus-visible:ring-forest/40 active:bg-black/[0.03] disabled:opacity-50 lg:h-9 lg:px-3.5";

/** "Descargar PDF" (made on the phone) and "Exportar CSV" (payments or invoices), both for the period shown. */
function ExportActions({
  report: r,
  rangeLabel,
  inline = false,
}: {
  report: Report;
  rangeLabel: string;
  inline?: boolean;
}) {
  const { t, lang } = useLang();
  const label = useBucketLabels(r.byMonth);
  const [busy, setBusy] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tag = `${r.range.from}_${r.range.to}`;

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !menuRef.current?.contains(e.target as Node)
      )
        setMenu(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  const csv = (name: string, text: string) => {
    download(name, new Blob([text], { type: "text/csv;charset=utf-8" }));
    setMenu(false);
  };
  const payments = () =>
    csv(
      `mano-pagos-${tag}.csv`,
      toCsv(
        t.csvPayments,
        r.payments.map((p) => [
          p.date,
          p.client,
          p.invoice,
          p.method === "—" ? "—" : t.payMethods[p.method],
          p.amount.toFixed(2),
        ]),
      ),
    );
  const invoices = () =>
    csv(
      `mano-facturas-${tag}.csv`,
      toCsv(
        t.csvInvoices,
        r.invoices.map((i) => [
          i.date,
          i.number,
          i.client,
          i.total.toFixed(2),
          i.paid ? t.yes : t.no,
        ]),
      ),
    );

  const pdf = async () => {
    setBusy(true);
    setPdfError(false);
    try {
      const [{ pdf: render }, { ReportPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/report-pdf"),
      ]);
      const loc = lang === "es" ? "es-US" : "en-US";
      const blob = await render(
        <ReportPdf
          report={r}
          text={{
            business: loadBusiness()?.businessName || "Mano",
            title: t.repPdfTitle,
            periodName: t.periods[r.period],
            rangeLabel,
            made: t.repPdfMade(
              new Intl.DateTimeFormat(loc, { dateStyle: "long" }).format(
                new Date(),
              ),
            ),
            bucketLabel: (i) => {
              const s = label.long(r.buckets[i]);
              return s.charAt(0).toUpperCase() + s.slice(1);
            },
            t: {
              ...t,
              repCollectedSub: t.repCollectedSub(t.periodIn[r.period]),
              invoices: t.repInvoices,
              payMethod: (m) =>
                t.payMethods[m as keyof typeof t.payMethods] ?? m,
            },
          }}
        />,
      ).toBlob();
      download(`mano-reporte-${tag}.pdf`, blob);
    } catch {
      setPdfError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={
        inline ? "flex items-center gap-2" : "grid gap-2 sm:grid-cols-2"
      }
    >
      <button
        type="button"
        onClick={pdf}
        disabled={busy}
        className={btnExport}
        aria-busy={busy}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
        ) : (
          <FileText className="size-4" strokeWidth={2} />
        )}
        {busy ? t.repPdfBusy : t.repDownloadPdf}
      </button>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-expanded={menu}
          aria-haspopup="menu"
          className={`${btnExport} w-full`}
        >
          <Download className="size-4" strokeWidth={2} />
          {t.repExportCsv}
          <ChevronDown
            className={`size-4 transition motion-reduce:transition-none ${menu ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </button>
        {menu && (
          <div
            role="menu"
            className={`absolute z-20 mt-1.5 min-w-full overflow-hidden rounded-[12px] border border-black/10 bg-white py-1 shadow-[0_8px_24px_-12px_rgba(32,37,34,0.25)] ${inline ? "right-0 w-48" : "left-0"}`}
          >
            <button
              type="button"
              role="menuitem"
              onClick={payments}
              className="flex h-11 w-full items-center px-4 text-left text-sm font-semibold hover:bg-black/[0.03] focus-visible:bg-black/[0.04] focus-visible:outline-none"
            >
              {t.repExportPayments}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={invoices}
              className="flex h-11 w-full items-center px-4 text-left text-sm font-semibold hover:bg-black/[0.03] focus-visible:bg-black/[0.04] focus-visible:outline-none"
            >
              {t.repExportInvoices}
            </button>
          </div>
        )}
      </div>
      {pdfError && (
        <p
          role="alert"
          className={`text-sm text-overdue-ink ${inline ? "" : "sm:col-span-2"}`}
        >
          {t.repPdfError}
        </p>
      )}
    </div>
  );
}

function Skeleton() {
  const block = "rounded-[16px] bg-black/[0.04] motion-safe:animate-pulse";
  return (
    <div aria-busy="true" className="mt-5 space-y-3">
      <div className={`h-36 ${block}`} />
      <div className="grid grid-cols-2 gap-3">
        <div className={`h-24 ${block}`} />
        <div className={`h-24 ${block}`} />
      </div>
      <div className={`h-64 ${block}`} />
    </div>
  );
}
