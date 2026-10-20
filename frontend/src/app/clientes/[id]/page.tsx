"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, FileText, Lock, Mail, MapPin, MessageCircle, Pencil, Phone, Trash2 } from "lucide-react";
import { JobStatusTag, PageHeader, Screen, Sheet, Title, btnPrimary, input } from "@/components/ui";
import { UpgradeCard } from "@/components/upgrade-card";
import { balanceDue, fmtDate, getJobs, invoiceState, money, onJobsChange, paidSoFar, phoneDigits, whatsappLink, type Job } from "@/lib/api";
import {
  addClientNote,
  clientNotes,
  ensureSavedClient,
  findClient,
  groupClients,
  loadSavedClients,
  newJobHref,
  removeClientNote,
  updateClientContact,
  type Client,
  type ClientNote,
} from "@/lib/clients";
import { useLang } from "@/lib/i18n";
import { formatPhone, isFullPhone, nextPhone } from "@/lib/phone";
import { getPlan, onPlanChange, type PlanInfo } from "@/lib/plan";
import { jobRow } from "@/lib/rows";

// One client: how to reach them, what they owe, their jobs, and (Solo) private notes.
export default function ClientePage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const ref = decodeURIComponent(id);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [tick, setTick] = useState(0); // saved clients changed (notes, contact)
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    getJobs().then(setJobs);
    return onJobsChange(() => void getJobs().then(setJobs));
  }, []);

  const client = jobs ? findClient(groupClients(jobs, loadSavedClients()), ref) : undefined;
  void tick;

  // a client known only through their jobs becomes a real one (an id) the first time the page opens
  useEffect(() => {
    if (client && !client.savedId) {
      const saved = ensureSavedClient(client);
      router.replace(`/clientes/${encodeURIComponent(saved.id)}`);
    }
  }, [client, router]);

  if (!jobs || (client && !client.savedId)) return <Screen>{null}</Screen>;
  if (!client)
    return (
      <Screen>
        <PageHeader backHref="/clientes" />
        <p className="mt-10 text-base text-muted">{t.clientNotFound}</p>
      </Screen>
    );

  const live = client.jobs.filter((j) => j.status !== "CANCELLED");
  const paid = live.reduce((s, j) => s + paidSoFar(j), 0);
  const owed = live.filter((j) => invoiceState(j) === "unpaid" || invoiceState(j) === "overdue").reduce((s, j) => s + balanceDue(j), 0);
  const overdue = live.filter((j) => invoiceState(j) === "overdue").reduce((s, j) => s + balanceDue(j), 0);
  const sites = [...new Set(client.jobs.map((j) => j.address?.trim()).filter(Boolean) as string[])];
  const tel = phoneDigits(client.phone);
  const wa = client.phone ? whatsappLink(client.phone, "") : null;
  const first = client.jobs.reduce((d, j) => (j.created_at < d ? j.created_at : d), client.since);
  const rows = [...client.jobs].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map((j) => jobRow(j, lang));

  const contactBtn = "flex h-11 flex-1 items-center justify-center gap-2 rounded-[12px] border border-forest/20 bg-white text-sm font-bold text-forest transition active:scale-[0.98] aria-disabled:pointer-events-none aria-disabled:opacity-40";

  return (
    <Screen className="lg:max-w-[1100px]!">
      <PageHeader
        backHref="/clientes"
        right={
          <button type="button" onClick={() => setEditing(true)} aria-label={t.editContact} className="flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-black/5">
            <Pencil className="size-4 text-forest" />
          </button>
        }
      />
      <Title>{client.name}</Title>
      <p className="mt-1 text-sm text-muted">{t.clientSince(fmtDate(first, lang))}</p>

      {/* phone: contact, money, jobs, notes · desktop: contact + notes on the left, money + jobs on the right */}
      <div className="mt-6 grid gap-4 [grid-template-areas:'contact'_'work'_'notes'] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-6 lg:[grid-template-areas:'contact_work'_'notes_work']">
          <section className="rounded-[20px] glass p-5 [grid-area:contact]">
            <div className="flex gap-2">
              <a href={tel ? `tel:+${tel}` : undefined} aria-disabled={!tel} className={contactBtn}>
                <Phone className="size-4" strokeWidth={2.25} /> {t.callShort}
              </a>
              <a href={wa ?? undefined} target="_blank" rel="noopener" aria-disabled={!wa} className={contactBtn}>
                <MessageCircle className="size-4" strokeWidth={2.25} /> {t.sendWhatsApp}
              </a>
              <a href={client.email ? `mailto:${client.email}` : undefined} aria-disabled={!client.email} className={contactBtn}>
                <Mail className="size-4" strokeWidth={2.25} /> {t.emailShort}
              </a>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0 text-muted" /> {formatPhone(client.phone)}
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 break-all">
                  <Mail className="size-4 shrink-0 text-muted" /> {client.email}
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted" /> {client.address}
                </div>
              )}
            </dl>
            {/* a company client: every house they've sent you to */}
            {sites.length > 1 && (
              <div className="mt-4 border-t border-black/5 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.clientAddresses}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {sites.map((s) => (
                    <li key={s} className="flex items-center gap-2">
                      <MapPin className="size-3.5 shrink-0 text-muted" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

        <div className="[grid-area:notes]">
          <Notes clientId={client.savedId!} onChange={() => setTick((n) => n + 1)} />
        </div>

        <div className="space-y-4 [grid-area:work]">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t.colBilled, value: client.billed },
              { label: t.clientPaid, value: paid, tone: "paid" },
              { label: t.owedTitle, value: owed },
              { label: t.overdueLabel, value: overdue, tone: overdue > 0 ? "overdue" : undefined },
            ].map((s) => (
              <div key={s.label} className="rounded-[16px] glass p-4">
                <p className="flex items-center gap-1.5 text-xs text-charcoal/60">
                  {s.tone && <span aria-hidden className={`size-2 rounded-full ${s.tone === "overdue" ? "bg-overdue-ink" : "bg-forest"}`} />}
                  {s.label}
                </p>
                <p className={`mt-1 text-xl font-bold tabular-nums ${s.tone === "overdue" ? "text-overdue-ink" : s.tone === "paid" ? "text-forest" : ""}`}>{money(s.value)}</p>
              </div>
            ))}
          </section>

          <section className="rounded-[20px] glass p-2">
            <div className="flex items-center justify-between px-3 pb-1 pt-2">
              <h2 className="text-base font-semibold">
                {t.navJobs} <span className="text-sm font-normal text-muted">· {t.clientJobs(client.jobs.length)}</span>
              </h2>
            </div>
            <ul className="divide-y divide-black/5">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link href={r.href} className="flex items-center gap-3 rounded-[12px] px-3 py-3 transition hover:bg-ivory/70">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[15px] font-semibold">{r.service}</span>
                        {r.total > 0 && <span className="shrink-0 font-bold tabular-nums">{money(r.total)}</span>}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-sm text-muted">{r.place ?? fmtDate(r.updated, lang)}</span>
                        <JobStatusTag job={r.job} />
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <Link href={newJobHref(client)} className={btnPrimary}>
            <FileText className="size-5" strokeWidth={2.25} /> {t.newJobFor(client.name)}
          </Link>
        </div>
      </div>

      {editing && <ContactEdit client={client} onClose={() => setEditing(false)} onSaved={() => (setEditing(false), setTick((n) => n + 1))} />}
    </Screen>
  );
}

// Private notes (Solo). Free sees what it's for, and the upgrade.
function Notes({ clientId, onChange }: { clientId: string; onChange: () => void }) {
  const { t, lang } = useLang();
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    setPlan(getPlan());
    setNotes(clientNotes(clientId));
    return onPlanChange(() => setPlan(getPlan()));
  }, [clientId]);
  if (!plan) return null;

  if (!plan.notes)
    return (
      <section>
        <UpgradeCard title={t.upgradeNotesTitle} body={t.upgradeNotesBody} from="notes" />
      </section>
    );

  const add = () => {
    if (!text.trim()) return;
    addClientNote(clientId, text);
    setNotes(clientNotes(clientId));
    setText("");
    onChange();
  };

  return (
    <section className="rounded-[20px] glass p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        {t.notesTitle}
        <span className="flex items-center gap-1 text-xs font-normal text-muted">
          <Lock className="size-3" /> {t.notesPrivate}
        </span>
      </h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder={t.notePlaceholder}
        className={`${input} mt-3 h-auto resize-none py-3 leading-6`}
      />
      <button type="button" onClick={add} disabled={!text.trim()} className="mt-2 h-10 rounded-[12px] bg-forest px-4 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-40">
        {t.addNote}
      </button>
      {notes.length > 0 && (
        <ul className="mt-4 space-y-3 border-t border-black/5 pt-4">
          {notes.map((n) => (
            <li key={n.id} className="group flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm leading-5">{n.text}</p>
                <p className="mt-1 text-xs text-muted">{fmtDate(n.created_at, lang)}</p>
              </div>
              <button
                type="button"
                onClick={() => (removeClientNote(clientId, n.id), setNotes(clientNotes(clientId)), onChange())}
                aria-label={t.deleteNote}
                className="shrink-0 p-1 text-charcoal/40 hover:text-overdue-ink"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Fix name / phone / email / address. Unsent jobs follow; sent documents don't change.
function ContactEdit({ client, onClose, onSaved }: { client: Client; onClose: () => void; onSaved: () => void }) {
  const { t } = useLang();
  const [form, setForm] = useState({ name: client.name, phone: client.phone ?? "", email: client.email ?? "", address: client.address ?? "" });
  const ok = form.name.trim() !== "" && (!form.phone.trim() || isFullPhone(form.phone));
  const save = () => {
    updateClientContact(client, {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
    });
    onSaved();
  };
  return (
    <Sheet open onClose={onClose} title={t.editContact}>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.clientName}</span>
          <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.customerPhone}</span>
          <input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: nextPhone(form.phone, e.target.value) })} type="tel" inputMode="tel" placeholder="(555) 123-4567" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.clientEmail}</span>
          <input className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" inputMode="email" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.address}</span>
          <input className={input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </label>
        <p className="text-xs leading-4 text-muted">{t.contactUpdatesUnsent}</p>
        <button type="button" onClick={save} disabled={!ok} className={btnPrimary}>
          {t.saveChanges}
        </button>
      </div>
    </Sheet>
  );
}

