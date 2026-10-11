"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { PageHeader, Screen, StatusBadge, Title } from "@/components/ui";
import { getJobs, onJobsChange, money, missingFieldLabel, type Job } from "@/lib/api";
import { useLang } from "@/lib/i18n";

export default function Trabajos() {
  const { t, lang } = useLang();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = () => getJobs().then((data) => { if (active) { setJobs(data); setError(""); } })
      .catch((e: Error) => { if (active) setError(e.message); });
    void refresh();
    const unsubscribe = onJobsChange(() => void refresh());
    return () => { active = false; unsubscribe(); };
  }, []);

  const active = jobs?.filter((j) => j.status !== "CANCELLED") ?? [];
  const cancelled = jobs?.filter((j) => j.status === "CANCELLED") ?? [];

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
      {error && <p role="alert" className="mt-4 text-sm text-[#8a2a17]">{error}</p>}
      {!jobs && !error && <p role="status" className="mt-6 text-muted">{lang === "es" ? "Cargando trabajos…" : "Loading jobs…"}</p>}

      {jobs && active.length === 0 && <p className="mt-6 text-base text-muted">{t.noJobs}</p>}

      <ul className="mt-6 space-y-3">
        {[...active, ...(showCancelled ? cancelled : [])].map((job) => (
          <li key={job.id}>
            <Link
              href={`/trabajos/${job.job_id}`}
              className={`flex items-center gap-3 rounded-[20px] glass p-4 transition active:scale-[0.99] ${job.status === "CANCELLED" ? "opacity-60" : ""}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold leading-5">{job.customer_name || "—"}</span>
                <span className="block truncate text-sm text-muted">
                  {job.job_title || job.job_description || "—"}
                </span>
                <span className="mt-2 block">
                  <StatusBadge status={job.status} />
                  {job.status === "NEEDS_INFORMATION" && <span className="ml-2 text-sm font-bold text-forest">{t.review}</span>}
                </span>
                {job.status === "NEEDS_INFORMATION" && <span className="mt-1 block text-xs text-ojo-ink">{job.missing_fields.map((key) => missingFieldLabel(key, lang)).join(" · ")}</span>}
              </span>
              <span className="text-lg font-bold">{money(job.job_price)}</span>
              <ChevronRight className="size-5 text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      {cancelled.length > 0 && (
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
