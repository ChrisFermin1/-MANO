"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { DocStateBadge, PageHeader, Screen, Title, btnPrimary, type DocState } from "@/components/ui";
import { estimateNo, fmtDate, getJobs, onJobsChange, invoiceNo, invoiceState, jobTotal, money, paidSoFar, STATUS_FLOW, type Job, balanceDue } from "@/lib/api";
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
      date: j.estimate_sent_at ?? j.updated_at,
      state: !j.estimate_sent_at
        ? "ready"
        : j.status === "CANCELLED" ? "declined" : STATUS_FLOW.indexOf(j.status) > STATUS_FLOW.indexOf("QUOTE_SENT") ? "accepted" : "sent",
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
      date: j.invoice_sent_at ?? j.updated_at,
      state: invoiceState(j)!,
      href: `/trabajos/${j.id}/factura`,
      due: j.invoice_sent_at ? (j.invoice_due_at ?? undefined) : undefined,
    }));
}

// the tab follows ?tab= (the desktop sidebar has Estimados and Facturas as separate links)
export default function DocumentosPage() {
  return (
    <Suspense>
      <Documentos />
    </Suspense>
  );
}

function Documentos() {
  const { t, lang } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [tab, setTabState] = useState<Tab>("estimates");
  const setTab = (k: Tab) => {
    setTabState(k);
    router.replace(`/documentos?tab=${k}`, { scroll: false });
  };

  useEffect(() => {
    // ?tab=invoices: the dashboard's money card and the sidebar's "Facturas"
    setTabState(params?.get("tab") === "invoices" ? "invoices" : "estimates");
  }, [params]);

  useEffect(() => {
    getJobs().then(setJobs);
    return onJobsChange(() => void getJobs().then(setJobs));
  }, []);

  const rows = jobs ? (tab === "estimates" ? estimateRows(jobs) : invoiceRows(jobs)) : [];
  const invoices = jobs ? invoiceRows(jobs) : [];
  const outstanding = invoices.filter((r) => r.state !== "paid" && r.state !== "ready").reduce((s, r) => s + balanceDue(r.job), 0);
  const collected = invoices.filter((r) => r.state !== "ready").reduce((s, r) => s + paidSoFar(r.job), 0);

  return (
    <Screen>
      <PageHeader
        backHref="/inicio"
        right={
          <>
            <Link
              href={tab === "invoices" ? "/trabajos/nuevo?doc=invoice" : "/trabajos/nuevo?doc=estimate"}
              aria-label={tab === "invoices" ? t.docInvoice : t.docEstimate}
              className="flex size-10 items-center justify-center rounded-full bg-forest lg:hidden"
            >
              <Plus className="size-5 text-white" strokeWidth={2.75} />
            </Link>
            <span className="hidden lg:block">
              <Link href={tab === "invoices" ? "/trabajos/nuevo?doc=invoice" : "/trabajos/nuevo?doc=estimate"} className={btnPrimary}>
                <Plus className="size-5" strokeWidth={2.75} />
                {tab === "invoices" ? t.newInvoice : t.newEstimate}
              </Link>
            </span>
          </>
        }
      />
      {/* desktop: Estimados and Facturas are separate sections in the sidebar */}
      <span className="lg:hidden">
        <Title>{t.docsTitle}</Title>
      </span>
      <span className="hidden lg:block">
        <Title>{tab === "invoices" ? t.navInvoices : t.navEstimates}</Title>
      </span>

      <div className="glass mt-6 grid grid-cols-2 rounded-[14px] p-1 lg:hidden" role="tablist">
        {(["estimates", "invoices"] as Tab[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`h-10 rounded-[10px] text-sm font-semibold transition ${tab === k ? "bg-forest text-white" : "text-charcoal/70"}`}
          >
            {k === "estimates" ? t.tabEstimates : t.tabInvoices}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:max-w-[560px]">
          {/* same as Home's numbers: white, the dot carries the meaning (peach is Ojo's color) */}
          <div className="rounded-[16px] glass p-4">
            <p className="text-xs font-medium text-charcoal/60">{t.outstanding}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{money(outstanding)}</p>
          </div>
          <div className="rounded-[16px] glass p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-charcoal/60">
              <span aria-hidden className="size-2 rounded-full bg-forest" /> {t.collected}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-forest">{money(collected)}</p>
          </div>
        </div>
      )}

      {jobs && rows.length === 0 && <p className="mt-8 text-base text-muted">{t.noDocs}</p>}

      {/* tablet + desktop: a table; click a row to open it */}
      {rows.length > 0 && (
        <div className="mt-5 hidden overflow-hidden rounded-[16px] border border-black/5 bg-white md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 bg-ivory/60 font-mono text-[11px] uppercase tracking-[1px] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t.colNumber}</th>
                <th className="px-4 py-3 font-medium">{t.colClient}</th>
                <th className="px-4 py-3 font-medium">{t.colDate}</th>
                {tab === "invoices" && <th className="px-4 py-3 font-medium">{t.colDue}</th>}
                <th className="px-4 py-3 font-medium">{t.colStatus}</th>
                <th className="px-4 py-3 text-right font-medium">{t.colTotal}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.number} onClick={() => router.push(r.href)} className="cursor-pointer border-b border-black/5 transition last:border-0 hover:bg-ivory/70">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                    <Link href={r.href} onClick={(e) => e.stopPropagation()}>
                      {r.number}
                    </Link>
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 font-semibold lg:max-w-[260px]">{r.job.customer_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-charcoal/70">{fmtDate(r.date, lang)}</td>
                  {tab === "invoices" && (
                    <td className="whitespace-nowrap px-4 py-3 text-charcoal/70">{r.due && r.state !== "paid" ? fmtDate(r.due, lang) : "—"}</td>
                  )}
                  <td className="px-4 py-3">
                    <DocStateBadge state={r.state} label={t.docState[r.state]} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <span className="font-bold">{money(jobTotal(r.job))}</span>
                    {tab === "invoices" && r.state !== "paid" && paidSoFar(r.job) > 0 && (
                      <span className="block text-xs text-muted">{t.leftToPay(money(balanceDue(r.job)))}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ul className="mt-4 space-y-3 md:hidden">
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
                {tab === "invoices" && r.state !== "paid" && paidSoFar(r.job) > 0 && <span className="text-xs text-muted">{t.leftToPay(money(balanceDue(r.job)))}</span>}
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
