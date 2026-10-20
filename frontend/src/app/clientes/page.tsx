"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Mail, MapPin, Phone, Plus } from "lucide-react";
import { PageHeader, Screen, Sheet, StatusBadge, Title, btnPrimary, btnSecondary, input } from "@/components/ui";
import { getJobs, money, onJobsChange, phoneDigits, type Job, isInvoiceJob } from "@/lib/api";
import { groupClients, loadSavedClients, newJobHref, saveClient, type Client } from "@/lib/clients";
import { useLang } from "@/lib/i18n";
import { formatPhone, nextPhone } from "@/lib/phone";

export default function Clientes() {
  const { t } = useLang();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });

  useEffect(() => {
    const load = () => void getJobs().then(setJobs);
    load();
    return onJobsChange(load);
  }, []);
  useEffect(() => {
    if (jobs) setClients(groupClients(jobs, loadSavedClients()));
  }, [jobs]);

  const add = () => {
    if (!form.name.trim()) return;
    const clean = (v: string) => v.trim() || null;
    saveClient({ name: form.name.trim(), phone: clean(form.phone), email: clean(form.email), address: clean(form.address) });
    setClients(groupClients(jobs ?? [], loadSavedClients()));
    setForm({ name: "", phone: "", email: "", address: "" });
    setAdding(false);
  };

  return (
    <Screen>
      <PageHeader
        backHref="/inicio"
        right={
          <>
            <button
              type="button"
              onClick={() => setAdding(true)}
              aria-label={t.newClient}
              className="flex size-10 items-center justify-center rounded-full bg-forest lg:hidden"
            >
              <Plus className="size-5 text-white" strokeWidth={2.75} />
            </button>
            <span className="hidden lg:block">
              <button type="button" onClick={() => setAdding(true)} className={btnPrimary}>
                <Plus className="size-5" strokeWidth={2.75} />
                {t.newClient}
              </button>
            </span>
          </>
        }
      />
      <Title>{t.clientsTitle}</Title>
      {clients && clients.length === 0 && <p className="mt-6 text-base text-muted">{t.clientsEmpty}</p>}

      {/* desktop: a table */}
      {clients && clients.length > 0 && (
        <div className="mt-6 hidden overflow-hidden rounded-[16px] border border-black/5 bg-white lg:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 bg-ivory/60 font-mono text-[11px] uppercase tracking-[1px] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t.colClient}</th>
                <th className="px-4 py-3 font-medium">{t.colPhone}</th>
                <th className="px-4 py-3 font-medium">{t.colEmail}</th>
                <th className="px-4 py-3 font-medium">{t.colAddress}</th>
                <th className="px-4 py-3 text-right font-medium">{t.colJobs}</th>
                <th className="px-4 py-3 text-right font-medium">{t.colBilled}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const tel = phoneDigits(c.phone);
                return (
                  <tr key={c.key} className="border-b border-black/5 transition last:border-0 hover:bg-ivory/70">
                    <td className="max-w-[220px] truncate px-4 py-3 font-semibold">{c.name}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {c.phone && tel ? (
                        <a href={`tel:+${tel}`} className="text-forest hover:underline">
                          {formatPhone(c.phone)}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="text-forest hover:underline">
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-charcoal/70">{c.address || "—"}</td>
                    <td className="px-4 py-3 text-right">{c.jobs.length}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold">{c.billed > 0 ? money(c.billed) : "—"}</td>
                    <td className="w-px whitespace-nowrap px-4 py-2 text-right">
                      <Link href={newJobHref(c)} className={`${btnSecondary} whitespace-nowrap desk:h-9! desk:px-3! desk:text-sm!`}>
                        <FileText className="size-4" strokeWidth={2.25} />
                        {t.newJob}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ul className="mt-6 space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:hidden">
        {clients?.map((c) => {
          const tel = phoneDigits(c.phone);
          return (
            <li key={c.key} className="rounded-[20px] glass p-4 md:flex md:flex-col">
              {/* tablet: two cards per row; the button sits at the bottom so the row's buttons line up */}
              <div className="md:flex-1 md:pb-3">
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
                  {c.billed > 0 && <span className="block text-lg font-bold">{money(c.billed)}</span>}
                  <span className="block text-xs text-muted">{t.clientJobs(c.jobs.length)}</span>
                </span>
              </div>
              {(c.phone || c.email) && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {c.phone && tel && (
                    <a href={`tel:+${tel}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest">
                      <Phone className="size-3.5" /> {formatPhone(c.phone)}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="inline-flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-forest">
                      <Mail className="size-3.5 shrink-0" /> {c.email}
                    </a>
                  )}
                </div>
              )}
              {c.jobs.length > 0 && (
                <ul className="mt-3 divide-y divide-black/5 border-t border-black/5">
                  {c.jobs.map((job) => (
                    <li key={job.id}>
                      <Link href={`/trabajos/${job.id}`} className="flex items-center gap-2 py-2.5 text-sm">
                        <span className="min-w-0 flex-1 truncate">{job.line_items[0]?.description_es || job.line_items[0]?.description || job.description}</span>
                        <StatusBadge status={job.status} invoice={isInvoiceJob(job)} />
                        <ChevronRight className="size-4 shrink-0 text-charcoal/40" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              </div>
              <Link
                href={newJobHref(c)}
                className="mt-3 flex w-full min-w-0 items-center justify-center gap-1.5 rounded-[14px] bg-ivory px-3 py-2.5 md:mt-0 text-sm font-semibold text-forest transition active:scale-[0.99]"
              >
                <FileText className="size-4 shrink-0" strokeWidth={2.25} /> <span className="truncate">{t.newJobFor(c.name)}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <Sheet open={adding} onClose={() => setAdding(false)} title={t.newClient}>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t.clientName}</span>
            <input
              className={input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="off"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              {t.customerPhone} <span className="font-normal text-muted">· {t.optional}</span>
            </span>
            <input
              className={input}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: nextPhone(form.phone, e.target.value) })}
              type="tel"
              inputMode="tel"
              placeholder="(555) 123-4567"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              {t.clientEmail} <span className="font-normal text-muted">· {t.optional}</span>
            </span>
            <input
              className={input}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              inputMode="email"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              {t.address} <span className="font-normal text-muted">· {t.optional}</span>
            </span>
            <input className={input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
        </div>
        <button type="button" onClick={add} disabled={!form.name.trim()} className={`mt-5 ${btnPrimary}`}>
          {t.saveClient}
        </button>
      </Sheet>
    </Screen>
  );
}
