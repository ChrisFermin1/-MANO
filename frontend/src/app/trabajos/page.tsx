"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Search, X } from "lucide-react";
import { PageHeader, Screen, StatusBadge, Title } from "@/components/ui";
import { estimateNo, getJobs, onJobsChange, invoiceNo, jobTotal, money, type Job } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { jobSubtitle } from "@/lib/services";
import { matchesJob } from "@/lib/search";

export default function Trabajos() {
  const { t, lang } = useLang();
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
          <Link href="/trabajos/nuevo" aria-label={t.newJob} className="flex size-10 items-center justify-center rounded-full bg-forest">
            <Plus className="size-5 text-lime" strokeWidth={2.75} />
          </Link>
        }
      />
      <Title>{t.jobsTitle}</Title>

      {jobs && jobs.length > 0 && (
        <label className="glass mt-5 flex h-12 items-center gap-2 rounded-[16px] px-4">
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
            <button type="button" onClick={() => setQuery("")} aria-label={t.clearSearch} className="-mr-1 shrink-0 p-1 text-black/50">
              <X className="size-4" />
            </button>
          )}
        </label>
      )}

      {jobs && active.length === 0 && !searching && <p className="mt-6 text-base text-muted">{t.noJobs}</p>}
      {results && results.length === 0 && <p className="mt-6 text-base text-muted">{t.noResults(query.trim())}</p>}

      <ul className="mt-4 space-y-3">
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
                  <StatusBadge status={job.status} invoice={job.doc_intent === "invoice"} />
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
