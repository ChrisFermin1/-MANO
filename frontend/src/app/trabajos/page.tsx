"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Search, X } from "lucide-react";
import { PageHeader, Screen, StatusBadge, Title, btnPrimary } from "@/components/ui";
import { fmtDate, getJobs, onJobsChange, money, type Job } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { matchesJob } from "@/lib/search";
import { jobRow } from "@/lib/rows";

export default function Trabajos() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getJobs().then(setJobs);
    return onJobsChange(() => void getJobs().then(setJobs));
  }, []);

  const active = jobs?.filter((j) => j.status !== "CANCELLED") ?? [];
  const cancelled = jobs?.filter((j) => j.status === "CANCELLED") ?? [];
  // Searching looks through everything, cancelled jobs included
  const searching = query.trim() !== "";
  const results = searching ? (jobs ?? []).filter((j) => matchesJob(j, query)) : null;
  const shown = results ?? [...active, ...(showCancelled ? cancelled : [])];
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

      {jobs && active.length === 0 && !searching && <p className="mt-6 text-base text-muted">{t.noJobs}</p>}
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
                    <StatusBadge status={r.job.status} invoice={r.invoice} />
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
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold leading-5">{r.client}</span>
                <span className="block truncate text-sm text-muted">
                  {r.subtitle}
                  {r.doc && <span className="font-mono text-xs">{` · ${r.doc}`}</span>}
                </span>
                <span className="mt-2 block">
                  <StatusBadge status={r.job.status} invoice={r.invoice} />
                </span>
              </span>
              <span className="text-lg font-bold">{r.total ? money(r.total) : "—"}</span>
              <ChevronRight className="size-5 text-muted" />
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
