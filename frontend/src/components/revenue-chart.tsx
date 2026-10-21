"use client";

import { useState } from "react";
import { money } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import type { Bucket, Report } from "@/lib/reports";

// Money collected in the report's period: months for "Este año", weeks for a month. Real payments only (the same
// buckets the PDF and the Cobrado number use). Hover / focus / tap a bar to read it; screen readers get a table.

const noon = (iso: string) => new Date(`${iso}T12:00:00`);

/** A round top for the scale ($1,150 → $1,500), so the gridlines read as plain numbers. */
function niceMax(n: number) {
  const pow = 10 ** Math.floor(Math.log10(n));
  return (
    ([1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].find((m) => m * pow >= n) ?? 10) * pow
  );
}
const compact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function useBucketLabels(byMonth: boolean) {
  const { t, lang } = useLang();
  const loc = lang === "es" ? "es-US" : "en-US";
  const monthLong = new Intl.DateTimeFormat(loc, { month: "long" });
  const dayMonth = new Intl.DateTimeFormat(loc, {
    day: "numeric",
    month: "short",
  });
  return {
    /** "octubre" / "8–14 oct" */
    long: (b: Bucket) =>
      byMonth
        ? monthLong.format(noon(b.from))
        : dayMonth.formatRange(noon(b.from), noon(b.to)),
    /** under the bar: "O" / "8–14" */
    short: (b: Bucket) =>
      byMonth
        ? t.monthsShort[noon(b.from).getMonth()]
        : `${noon(b.from).getDate()}–${noon(b.to).getDate()}`,
    /** "en octubre" / "la semana del 8–14 oct" */
    when: (b: Bucket) =>
      byMonth
        ? t.repMonthOf(monthLong.format(noon(b.from)))
        : t.repWeekOf(dayMonth.formatRange(noon(b.from), noon(b.to))),
  };
}

export function RevenueChart({ report }: { report: Report }) {
  const { t, lang } = useLang();
  const { buckets, byMonth, today, collected, range } = report;
  const [active, setActive] = useState<number | null>(null);
  const label = useBucketLabels(byMonth);
  const loc = lang === "es" ? "es-US" : "en-US";
  const subtitle = byMonth
    ? t.repChartByMonth(Number(range.from.slice(0, 4)))
    : t.repChartByWeek(
        new Intl.DateTimeFormat(loc, { month: "long" }).format(
          noon(range.from),
        ),
      );
  const withMoney = buckets.filter((b) => b.amount > 0);
  const top = niceMax(Math.max(1, ...buckets.map((b) => b.amount)));
  const isNow = (b: Bucket) => today >= b.from && today <= b.to;
  const shown = active === null ? null : buckets[active];

  return (
    <section
      aria-labelledby="chart-title"
      className="rounded-[20px] glass p-5 lg:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="chart-title" className="text-base font-semibold">
            {t.repChartTitle}
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/60 first-letter:uppercase">
            {subtitle}
          </p>
        </div>
        {collected > 0 && (
          // what the finger / mouse is on, otherwise the period's total
          <div className="text-right" aria-live="polite">
            <p className="text-xs text-charcoal/60 first-letter:uppercase">
              {shown ? label.long(shown) : t.repChartTotal}
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {money(shown ? shown.amount : collected)}
            </p>
          </div>
        )}
      </div>

      {collected === 0 ? (
        <div className="mt-6 rounded-[14px] border border-dashed border-black/10 px-5 py-8 text-center">
          <p className="font-semibold">{t.repEmptyTitle}</p>
          <p className="mx-auto mt-1 max-w-[30ch] text-sm text-charcoal/60">
            {t.repEmptyBody}
          </p>
        </div>
      ) : withMoney.length === 1 ? (
        // one bar among empty ones looks unfinished: say it plainly instead
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-sm font-semibold first-letter:uppercase">
              {label.long(withMoney[0])}
            </span>
            <div className="h-9 flex-1 rounded-[8px] bg-forest/80" />
          </div>
          <p className="mt-3 text-sm text-charcoal/60">
            {t.repChartSingle(label.when(withMoney[0]))}
          </p>
        </div>
      ) : (
        <div className="mt-6 flex gap-2" onMouseLeave={() => setActive(null)}>
          {/* scale: $0, half, top */}
          <div
            aria-hidden
            className="relative h-44 w-10 shrink-0 text-right text-[11px] text-charcoal/50 tabular-nums"
          >
            <span className="absolute right-0 top-0 -translate-y-1/2">
              {compact.format(top)}
            </span>
            <span className="absolute right-0 top-1/2 -translate-y-1/2">
              {compact.format(top / 2)}
            </span>
            <span className="absolute bottom-0 right-0 translate-y-1/2">
              $0
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative h-44">
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 border-t border-black/[0.06]"
              />
              <div
                aria-hidden
                className="absolute inset-x-0 top-1/2 border-t border-black/[0.06]"
              />
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 border-t border-black/10"
              />
              <div
                className={`relative flex h-full items-end ${buckets.length > 8 ? "gap-1.5 sm:gap-2.5" : "gap-3 sm:gap-5"}`}
              >
                {buckets.map((b, i) => {
                  const on = active === i;
                  const h =
                    b.amount > 0 ? Math.max(3, (b.amount / top) * 100) : 0;
                  return (
                    <button
                      key={b.from}
                      type="button"
                      aria-label={`${label.long(b)}: ${money(b.amount)}`}
                      aria-pressed={on}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      onClick={() => setActive(i)}
                      className="group flex h-full min-w-0 flex-1 cursor-default items-end rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
                    >
                      <span
                        className={`block w-full rounded-[6px] transition-colors motion-reduce:transition-none ${
                          b.amount === 0
                            ? "h-[2px] bg-black/[0.06]"
                            : on
                              ? "bg-forest"
                              : isNow(b)
                                ? "bg-forest/75"
                                : "bg-forest/25 group-hover:bg-forest/40"
                        }`}
                        style={b.amount > 0 ? { height: `${h}%` } : undefined}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              aria-hidden
              className={`mt-2 flex ${buckets.length > 8 ? "gap-1.5 sm:gap-2.5" : "gap-3 sm:gap-5"}`}
            >
              {buckets.map((b, i) => (
                <span
                  key={b.from}
                  className={`min-w-0 flex-1 truncate text-center text-[11px] tabular-nums ${active === i || isNow(b) ? "font-semibold text-charcoal" : "text-charcoal/50"}`}
                >
                  {label.short(b)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* the same numbers for screen readers */}
      <table className="sr-only">
        <caption>{t.repChartTable}</caption>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.from}>
              <th scope="row">{label.long(b)}</th>
              <td>{money(b.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
