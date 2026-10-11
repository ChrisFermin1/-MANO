"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DocStateBadge, PageHeader, Screen, Title, type DocState } from "@/components/ui";
import { estimateNo, fmtDate, getDemoJobs as getJobs, onJobsChange, invoiceNo, invoiceState, jobTotal, money, STATUS_FLOW, type Job } from "@/lib/api";
import { useLang } from "@/lib/i18n";

type Tab = "estimates" | "invoices";

type Row = { job: Job; number: string; date: string; state: DocState; href: string; due?: string };

function estimateRows(jobs: Job[]): Row[] {
  return jobs
    .filter((j) => j.estimate_number)
    .sort((a, b) => b.estimate_number! - a.estimate_number!)
    .map((j) => ({
      job: j,
      number: estimateNo(j.estimate_number!),
      date: j.estimate_sent_at!,
      state:
        j.status === "CANCELLED" ? "declined" : STATUS_FLOW.indexOf(j.status) > STATUS_FLOW.indexOf("QUOTE_SENT") ? "accepted" : "sent",
      href: `/trabajos/${j.id}/estimado`,
    }));
}

function invoiceRows(jobs: Job[]): Row[] {
  return jobs
    .filter((j) => j.invoice_number)
    .sort((a, b) => b.invoice_number! - a.invoice_number!)
    .map((j) => ({
      job: j,
      number: invoiceNo(j.invoice_number!),
      date: j.invoice_sent_at!,
      state: invoiceState(j)!,
      href: `/trabajos/${j.id}/factura`,
      due: j.invoice_due_at ?? undefined,
    }));
}

export default function Documentos() {
  const { t, lang } = useLang();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [tab, setTab] = useState<Tab>("estimates");

  useEffect(() => {
    // the dashboard's money card links here with ?tab=invoices
    if (new URLSearchParams(window.location.search).get("tab") === "invoices") setTab("invoices");
    getJobs().then(setJobs);
    return onJobsChange(() => void getJobs().then(setJobs));
  }, []);

  const rows = jobs ? (tab === "estimates" ? estimateRows(jobs) : invoiceRows(jobs)) : [];
  const invoices = jobs ? invoiceRows(jobs) : [];
  const outstanding = invoices.filter((r) => r.state !== "paid").reduce((s, r) => s + jobTotal(r.job), 0);
  const collected = invoices.filter((r) => r.state === "paid").reduce((s, r) => s + jobTotal(r.job), 0);

  return (
    <Screen>
      <PageHeader backHref="/inicio" />
      <Title>{t.docsTitle}</Title>
      <p className="mt-2 text-sm text-muted">{lang === "es" ? "Demostración: estos documentos no se guardan en PostgreSQL." : "Demo: these documents are not saved in PostgreSQL."}</p>

      <div className="glass mt-6 grid grid-cols-2 rounded-[14px] p-1" role="tablist">
        {(["estimates", "invoices"] as Tab[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`h-10 rounded-[10px] text-sm font-semibold transition ${tab === k ? "bg-forest text-lime" : "text-black/70"}`}
          >
            {k === "estimates" ? t.tabEstimates : t.tabInvoices}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[16px] glass-peach p-4">
            <p className="text-xs font-medium">{t.outstanding}</p>
            <p className="mt-1 text-2xl font-bold">{money(outstanding)}</p>
          </div>
          <div className="rounded-[16px] glass-lime p-4">
            <p className="text-xs font-medium">{t.collected}</p>
            <p className="mt-1 text-2xl font-bold">{money(collected)}</p>
          </div>
        </div>
      )}

      {jobs && rows.length === 0 && <p className="mt-8 text-base text-muted">{t.noDocs}</p>}

      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.number}>
            <Link href={r.href} className="flex items-center gap-3 rounded-[20px] glass p-4 transition active:scale-[0.99]">
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-xs text-muted">{r.number}</span>
                <span className="block truncate text-base font-semibold leading-5">{r.job.customer_name}</span>
                <span className="block text-xs text-muted">
                  {fmtDate(r.date, lang)}
                  {r.due && r.state !== "paid" && ` · ${t.dueOn(fmtDate(r.due, lang))}`}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1.5">
                <span className="text-lg font-bold">{money(jobTotal(r.job))}</span>
                <DocStateBadge state={r.state} label={t.docState[r.state]} />
              </span>
              <ChevronRight className="size-5 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
