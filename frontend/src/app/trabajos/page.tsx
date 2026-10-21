"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, Plus, Receipt, Search, X } from "lucide-react";
import { JobStatusTag, PageHeader, Screen, Title, btnPrimary } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { fmtDate, getJobs, invoiceState, onJobsChange, money, type Job } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { matchesJob } from "@/lib/search";
import { jobRow } from "@/lib/rows";

// What he looks for most: money owed, money late, estimates nobody answered
type Filter = "all" | "owed" | "overdue" | "noReply";
const FILTERS: Record<Filter, (j: Job) => boolean> = {
  all: () => true,
  owed: (j) => invoiceState(j) === "unpaid" || invoiceState(j) === "overdue",
  overdue: (j) => invoiceState(j) === "overdue",
  noReply: (j) => j.status === "QUOTE_SENT",
};

export default function Trabajos() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    // Reportes links here already filtered (/trabajos?f=overdue)
    const f = new URLSearchParams(window.location.search).get("f");
    if (f && f in FILTERS) setFilter(f as Filter);
    getJobs().then(setJobs);
    return onJobsChange(() => void getJobs().then(setJobs));
  }, []);

  const active = jobs?.filter((j) => j.status !== "CANCELLED") ?? [];
  const cancelled = jobs?.filter((j) => j.status === "CANCELLED") ?? [];
  // Searching looks through everything, cancelled jobs included
  const searching = query.trim() !== "";
  const results = searching ? (jobs ?? []).filter((j) => matchesJob(j, query)) : null;
  const shown = results ?? (filter === "all" ? [...active, ...(showCancelled ? cancelled : [])] : active.filter(FILTERS[filter]));
  const rows = shown.map((j) => jobRow(j, lang));

  return (
    <Screen>
      <PageHeader
        backHref="/inicio"
        right={
          <>
            <Link href="/trabajos/nuevo" aria-label={t.newJob} className="flex size-10 items-center justify-center rounded-full bg-forest lg:hidden">
              <Plus className="size-5 text-white" strokeWidth={2.75} />
            </Link>
            <span className="hidden lg:block">
              <Link href="/trabajos/nuevo" className={btnPrimary}>
                <Plus className="size-5" strokeWidth={2.75} />
                {t.newJob}
              </Link>
            </span>
          </>
        }
      />
      <Title>{t.jobsTitle}</Title>

      {jobs && jobs.length > 0 && (
        <label className="glass mt-5 flex h-12 items-center gap-2 rounded-[16px] px-4 md:max-w-[420px] lg:h-11 lg:rounded-[12px]">
          <Search className="size-5 shrink-0 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchJobs}
            aria-label={t.searchJobs}
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          {searching && (
            <button type="button" onClick={() => setQuery("")} aria-label={t.clearSearch} className="-mr-1 shrink-0 p-1 text-charcoal/50">
              <X className="size-4" />
            </button>
          )}
        </label>
      )}

      {/* quick filters, with how many each has (search looks through everything instead) */}
      {active.length > 0 && !searching && (
        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {(Object.keys(FILTERS) as Filter[]).map((f) => {
            const n = active.filter(FILTERS[f]).length;
            const on = filter === f;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(f)}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition ${
                  on ? "bg-forest text-white" : "border border-black/10 bg-white text-charcoal/75 hover:border-forest/30"
                }`}
              >
                {t.jobFilters[f]}
                <span className={`tabular-nums ${on ? "text-white/70" : "text-muted"}`}>{n}</span>
              </button>
            );
          })}
        </div>
      )}
      {jobs && active.length > 0 && !searching && rows.length === 0 && <p className="mt-6 text-base text-muted">{t.noJobsInFilter}</p>}

      {jobs && jobs.length === 0 && (
        <EmptyState
          icon={FileText}
          title={t.emptyStartTitle}
          body={t.emptyStartBody}
          primary={{ label: t.newEstimate, href: "/trabajos/nuevo?doc=estimate", icon: FileText }}
          secondary={{ label: t.newInvoice, href: "/trabajos/nuevo?doc=invoice", icon: Receipt }}
        />
      )}
      {jobs && jobs.length > 0 && active.length === 0 && !searching && <p className="mt-6 text-base text-muted">{t.noJobs}</p>}
      {results && results.length === 0 && <p className="mt-6 text-base text-muted">{t.noResults(query.trim())}</p>}

      {/* the same rows (lib/rows.ts) in two layouts: a table on tablet and desktop, cards on the phone.
          Tablet keeps the 4 columns that matter; address, document and date join on desktop. */}
      {rows.length > 0 && (
        <div className="mt-5 hidden overflow-hidden rounded-[16px] border border-black/5 bg-white md:block">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[28%] lg:w-[17%]" />
              <col className="w-[33%] lg:w-[16%]" />
              <col className="hidden lg:table-column lg:w-[19%]" />
              <col className="hidden lg:table-column lg:w-[9%]" />
              <col className="w-[23%] lg:w-[19%]" />
              <col className="hidden lg:table-column lg:w-[11%]" />
              <col className="w-[16%] lg:w-[9%]" />
            </colgroup>
            <thead className="border-b border-black/5 bg-ivory/60 font-mono text-[11px] uppercase tracking-[1px] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t.colClient}</th>
                <th className="px-4 py-3 font-medium">{t.colJob}</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">{t.colAddress}</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">{t.colDoc}</th>
                <th className="px-4 py-3 font-medium">{t.colStatus}</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">{t.colUpdated}</th>
                <th className="px-4 py-3 text-right font-medium">{t.colTotal}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(r.href)}
                  className={`cursor-pointer border-b border-black/5 transition last:border-0 hover:bg-ivory/70 ${r.cancelled ? "opacity-60" : ""}`}
                >
                  <td className="truncate px-4 py-3">
                    <Link href={r.href} className="block truncate font-semibold" onClick={(e) => e.stopPropagation()}>
                      {r.client}
                    </Link>
                  </td>
                  <td className="truncate px-4 py-3">{r.service || "—"}</td>
                  <td className="hidden truncate px-4 py-3 text-charcoal/70 lg:table-cell">{r.place ?? (r.sites > 1 ? t.nSites(r.sites) : "—")}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 font-mono text-xs text-charcoal/70 lg:table-cell">{r.doc ?? "—"}</td>
                  <td className="px-4 py-3">
                    <JobStatusTag job={r.job} />
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-charcoal/70 lg:table-cell">{fmtDate(r.updated, lang)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold">{r.total ? money(r.total) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ul className="mt-4 space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={r.href}
              className={`flex items-center gap-3 rounded-[20px] glass p-4 transition active:scale-[0.99] ${r.cancelled ? "opacity-60" : ""}`}
            >
              {/* two lines: who + how much · where + where it stands */}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-base font-semibold leading-5">{r.client}</span>
                  {r.total > 0 && <span className="shrink-0 text-base font-bold tabular-nums">{money(r.total)}</span>}
                </span>
                <span className="mt-1.5 flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-muted">{r.subtitle}</span>
                  <span className="shrink-0">
                    <JobStatusTag job={r.job} />
                  </span>
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      {cancelled.length > 0 && !searching && (
        <button
          type="button"
          onClick={() => setShowCancelled((v) => !v)}
          className="mt-4 self-center px-4 py-2 text-sm font-semibold text-forest underline underline-offset-4"
        >
          {showCancelled ? t.hideCancelled : t.showCancelled(cancelled.length)}
        </button>
      )}
    </Screen>
  );
}
