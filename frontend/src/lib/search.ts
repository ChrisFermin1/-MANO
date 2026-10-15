// Search: "perez" finds "Pérez", "inv 1" finds INV-0001, "maria oak" needs both words.

import { estimateNo, invoiceNo, type Job } from "@/lib/api";

/** Lowercase, no accents, only letters/numbers/spaces. */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function jobText(job: Job): string {
  const docs = [
    job.estimate_number ? `${estimateNo(job.estimate_number)} est ${job.estimate_number}` : "",
    job.invoice_number ? `${invoiceNo(job.invoice_number)} inv ${job.invoice_number}` : "",
  ];
  return normalize(
    [
      job.customer_name,
      job.address,
      job.customer_phone,
      job.customer_phone?.replace(/\D/g, ""),
      job.service,
      job.service_es,
      job.description,
      ...job.line_items.flatMap((i) => [i.description, i.description_es]),
      ...docs,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** Every word of the query appears somewhere in the job. Numbers match without leading zeros ("0001" = "1"). */
export function matchesJob(job: Job, query: string): boolean {
  const words = normalize(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const text = ` ${jobText(job)} `;
  return words.every((w) => {
    const n = /^\d+$/.test(w) ? String(Number(w)) : null;
    return text.includes(w) || (n !== null && text.includes(` ${n} `));
  });
}
