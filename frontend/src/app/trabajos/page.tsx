"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { PageHeader, Screen, StatusBadge, Title } from "@/components/ui";
import { estimateNo, getJobs, invoiceNo, jobTotal, money, type Job } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { serviceLabel } from "@/lib/services";

export default function Trabajos() {
  const { t, lang } = useLang();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    getJobs().then(setJobs);
    const onStorage = (e: StorageEvent) => e.key === "mano.jobs" && getJobs().then(setJobs);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
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

      {jobs && active.length === 0 && <p className="mt-6 text-base text-muted">{t.noJobs}</p>}

      <ul className="mt-6 space-y-3">
        {[...active, ...(showCancelled ? cancelled : [])].map((job) => (
          <li key={job.id}>
            <Link
              href={`/trabajos/${job.id}`}
              className={`flex items-center gap-3 rounded-[20px] bg-white p-4 transition active:scale-[0.99] ${job.status === "CANCELLED" ? "opacity-60" : ""}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold leading-5">{job.customer_name || "—"}</span>
                <span className="block truncate text-sm text-muted">
                  {serviceLabel(job.service, lang)}
                  {(job.invoice_number || job.estimate_number) && (
                    <span className="font-mono text-xs">
                      {" · "}
                      {job.invoice_number ? invoiceNo(job.invoice_number) : estimateNo(job.estimate_number!)}
                    </span>
                  )}
                </span>
                <span className="mt-2 block">
                  <StatusBadge status={job.status} />
                </span>
              </span>
              <span className="text-lg font-bold">{jobTotal(job) ? money(jobTotal(job)) : "—"}</span>
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
