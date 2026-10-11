"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Phone } from "lucide-react";
import { PageHeader, Screen, StatusBadge, Title } from "@/components/ui";
import { getJobs, jobTotal, money, onJobsChange, phoneDigits, type Job } from "@/lib/api";
import { useLang } from "@/lib/i18n";

type Client = { name: string; phone: string | null; address: string | null; jobs: Job[]; billed: number };

// One card per client (a client with several jobs shows once), newest work first
function groupClients(jobs: Job[]): Client[] {
  const byName = new Map<string, Client>();
  for (const job of jobs) {
    const name = job.customer_name?.trim();
    if (!name) continue;
    const key = name.toLowerCase().replace(/\s+/g, " ");
    const c = byName.get(key) ?? { name, phone: null, address: null, jobs: [], billed: 0 };
    c.jobs.push(job);
    c.phone ||= job.customer_phone?.trim() || null;
    c.address ||= job.address?.trim() || null;
    if (job.status !== "CANCELLED") c.billed += jobTotal(job);
    byName.set(key, c);
  }
  return [...byName.values()].sort((a, b) => b.jobs[0].updated_at.localeCompare(a.jobs[0].updated_at));
}

export default function Clientes() {
  const { t } = useLang();
  const [clients, setClients] = useState<Client[] | null>(null);

  useEffect(() => {
    const load = () => void getJobs().then((jobs) => setClients(groupClients(jobs)));
    load();
    return onJobsChange(load);
  }, []);

  return (
    <Screen>
      <PageHeader backHref="/inicio" />
      <Title>{t.clientsTitle}</Title>
      {clients && clients.length === 0 && <p className="mt-6 text-base text-muted">{t.clientsEmpty}</p>}

      <ul className="mt-6 space-y-3">
        {clients?.map((c) => {
          const tel = phoneDigits(c.phone);
          return (
            <li key={c.name} className="rounded-[20px] glass p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold leading-5">{c.name}</p>
                  {c.address && (
                    <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted">
                      <MapPin className="size-3.5 shrink-0" /> {c.address}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-right">
                  <span className="block text-lg font-bold">{money(c.billed)}</span>
                  <span className="block text-xs text-muted">{t.clientJobs(c.jobs.length)}</span>
                </span>
              </div>
              {c.phone && tel && (
                <a href={`tel:+${tel}`} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-forest">
                  <Phone className="size-3.5" /> {c.phone}
                </a>
              )}
              <ul className="mt-3 divide-y divide-black/5 border-t border-black/5">
                {c.jobs.map((job) => (
                  <li key={job.id}>
                    <Link href={`/trabajos/${job.id}`} className="flex items-center gap-2 py-2.5 text-sm">
                      <span className="min-w-0 flex-1 truncate">{job.line_items[0]?.description_es || job.line_items[0]?.description || job.description}</span>
                      <StatusBadge status={job.status} invoice={job.doc_intent === "invoice"} />
                      <ChevronRight className="size-4 shrink-0 text-black/40" />
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
