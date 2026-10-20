"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Search, X } from "lucide-react";
import { PageHeader, Screen, StatusBadge, Title, btnPrimary } from "@/components/ui";
import { estimateNo, fmtDate, getJobs, onJobsChange, invoiceNo, jobTotal, money, type Job, isInvoiceJob } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { jobSubtitle } from "@/lib/services";
import { matchesJob } from "@/lib/search";

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
        <label className="glass mt-5 flex h-12 items-center gap-2 rounded-[16px] px-4 lg:max-w-[420px] lg:h-11 lg:rounded-[12px]">
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

      {/* desktop: a table; click a row to open the job */}
      {shown.length > 0 && (
        <div className="mt-5 hidden overflow-hidden rounded-[16px] border border-black/5 bg-white lg:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 bg-ivory/60 font-mono text-[11px] uppercase tracking-[1px] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t.colClient}</th>
                <th className="px-4 py-3 font-medium">{t.colJob}</th>
                <th className="px-4 py-3 font-medium">{t.colDoc}</th>
                <th className="px-4 py-3 font-medium">{t.colStatus}</th>
                <th className="px-4 py-3 font-medium">{t.colUpdated}</th>
                <th className="px-4 py-3 text-right font-medium">{t.colTotal}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => router.push(`/trabajos/${job.id}`)}
                  className={`cursor-pointer border-b border-black/5 transition last:border-0 hover:bg-ivory/70 ${job.status === "CANCELLED" ? "opacity-60" : ""}`}
                >
                  <td className="max-w-[220px] px-4 py-3">
                    <Link href={`/trabajos/${job.id}`} className="block truncate font-semibold" onClick={(e) => e.stopPropagation()}>
                      {job.customer_name || "—"}
                    </Link>
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-3 text-charcoal/70">{jobSubtitle(job, lang)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-charcoal/70">
                    {job.invoice_number ? invoiceNo(job.invoice_number) : job.estimate_number ? estimateNo(job.estimate_number) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} invoice={isInvoiceJob(job)} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-charcoal/70">{fmtDate(job.updated_at, lang)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold">{jobTotal(job) ? money(jobTotal(job)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ul className="mt-4 space-y-3 lg:hidden">
        {shown.map((job) => (
          <li key={job.id}>
            <Link
              href={`/trabajos/${job.id}`}
              className={`flex items-center gap-3 rounded-[20px] glass p-4 transition active:scale-[0.99] ${job.status === "CANCELLED" ? "opacity-60" : ""}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold leading-5">{job.customer_name || "—"}</span>
                <span className="block truncate text-sm text-muted">
                  {jobSubtitle(job, lang)}
                  {(job.invoice_number || job.estimate_number) && (
                    <span className="font-mono text-xs">
                      {" · "}
                      {job.invoice_number ? invoiceNo(job.invoice_number) : estimateNo(job.estimate_number!)}
                    </span>
                  )}
                </span>
                <span className="mt-2 block">
                  <StatusBadge status={job.status} invoice={isInvoiceJob(job)} />
                </span>
              </span>
              <span className="text-lg font-bold">{jobTotal(job) ? money(jobTotal(job)) : "—"}</span>
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
