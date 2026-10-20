// One row per job, used by every list that shows jobs (phone cards, desktop tables, Home's recent jobs),
// so a new column or a change to what a row says happens here once and the layouts can't drift apart.

import { estimateNo, invoiceNo, isInvoiceJob, jobSites, jobTotal, type Job } from "@/lib/api";
import { jobSubtitle, serviceLabel } from "@/lib/services";

export type JobRow = {
  id: number;
  href: string;
  job: Job;
  client: string; // "—" when the note had no name
  service: string; // "Pintura interior"
  place: string | null; // the address, or null (then use `sites`)
  sites: number; // several houses on one invoice
  subtitle: string; // phone cards: the address, else the first line of work
  doc: string | null; // "INV-0003" / "EST-0002"
  invoice: boolean; // an invoice job (for the status label)
  updated: string; // ISO date
  total: number; // 0 = no price yet
  cancelled: boolean;
};

export function jobRow(job: Job, lang: "es" | "en"): JobRow {
  return {
    id: job.id,
    href: `/trabajos/${job.id}`,
    job,
    client: job.customer_name?.trim() || "—",
    service: serviceLabel(job.service, lang, job.service_es),
    place: job.address?.trim() || null,
    sites: jobSites(job).length,
    subtitle: jobSubtitle(job, lang),
    doc: job.invoice_number ? invoiceNo(job.invoice_number) : job.estimate_number ? estimateNo(job.estimate_number) : null,
    invoice: isInvoiceJob(job),
    updated: job.updated_at,
    total: jobTotal(job),
    cancelled: job.status === "CANCELLED",
  };
}
