"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Archive, Check, Ellipsis, Eye, PartyPopper, Phone, FileText, MessageCircle, Plus, Quote, Receipt, RotateCcw, Trash2, X } from "lucide-react";
import { AutoTextarea, DocStateBadge, OjoNote, PageHeader, Screen, Sheet, StatusBadge, Title, btnDanger, btnGhost, btnLime, btnPrimary, btnSecondary } from "@/components/ui";
import {
  CANCEL_REASONS,
  STATUS_FLOW,
  canCancel,
  canDelete,
  cancelJob,
  deleteJob,
  estimateNo,
  firstName,
  fmtDate,
  reactivateJob,
  type CancelReason,
  getJob, onJobsChange,
  invoiceNo,
  invoiceState,
  jobTotal,
  markPaid,
  money,
  nextStatus,
  setStatus,
  uid,
  updateJob,
  type InvoiceState,
  type Job,
  type LineItem,
  daysSince,
} from "@/lib/api";
import { ShareEstimate } from "@/components/share-estimate";
import { loadBusiness, saveBusiness, type Business } from "@/lib/business";
import { useLang } from "@/lib/i18n";
import { toEnglish } from "@/lib/translate";
import { serviceLabel } from "@/lib/services";
import { silencedFor, suggestions, validate } from "@/lib/ojo";

const EDITABLE = ["NEW", "NEEDS_INFORMATION", "READY_FOR_QUOTE"];

export default function Trabajo() {
  const { t } = useLang();
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null | undefined>(undefined);

  useEffect(() => {
    getJob(Number(id)).then(setJob);
    // Live update when the customer approves in another tab
    return onJobsChange(() => void getJob(Number(id)).then(setJob));
  }, [id]);

  if (job === undefined) return <Screen>{null}</Screen>;
  if (job === null)
    return (
      <Screen>
        <PageHeader backHref="/trabajos" />
        <p className="mt-10 text-base">{t.notFound}</p>
      </Screen>
    );

  return EDITABLE.includes(job.status) ? <ReviewJob job={job} setJob={setJob} /> : <TrackJob job={job} setJob={setJob} />;
}

/* ───────── Before the quote: Ojo checks, Carlos fills gaps ───────── */

function ReviewJob({ job, setJob }: { job: Job; setJob: (j: Job) => void }) {
  const { t, lang } = useLang();
  const router = useRouter();
  const missing = validate(job);
  const [biz, setBiz] = useState<Business | null>(null);
  useEffect(() => setBiz(loadBusiness()), []);
  const asks = suggestions(job, biz);
  const silenced = silencedFor(job, biz);
  const ask = asks[0]; // one question at a time
  const skipped = !!job.ojo_skipped; // ✕ on the card: skip all of Ojo's questions for this job
  const spanish = lang === "es"; // Carlos edits in Spanish; the estimate is always English
  const edited = useRef(new Set<string>()); // lines whose Spanish changed since the last translation

  const patch = (p: Partial<Job>) => {
    const next = { ...job, ...p };
    setJob(next);
    updateJob(job.id, p).then(setJob);
  };
  const setItem = (itemId: string, p: Partial<LineItem>) =>
    patch({ line_items: job.line_items.map((i) => (i.id === itemId ? { ...i, ...p } : i)) });
  const addItem = () => patch({ line_items: [...job.line_items, { id: uid(), description: "", description_es: "", amount: null }] });
  const acceptAsk = (key: string, description: string, description_es: string) =>
    patch({
      line_items: [...job.line_items, { id: uid(), description, description_es, amount: null }],
      ojo_dismissed: [...(job.ojo_dismissed ?? []), key],
    });
  const dismissAsk = (key: string) => patch({ ojo_dismissed: [...(job.ojo_dismissed ?? []), key] });
  const setIgnore = (ojoIgnore: string[]) => {
    saveBusiness({ ojoIgnore });
    setBiz((b) => (b ? { ...b, ojoIgnore } : b));
  };
  const alwaysIncluded = (key: string) => setIgnore([...(biz?.ojoIgnore ?? []), key]);
  const askAgain = (key: string) => setIgnore((biz?.ojoIgnore ?? []).filter((k) => k !== key));
  const removeItem = (itemId: string) => patch({ line_items: job.line_items.filter((i) => i.id !== itemId) });

  // ONE "missing" style everywhere: amber outline (+ a "falta" tag next to the label, so it's not color-only)
  const field = (missingIt: boolean) =>
    `h-[52px] w-full rounded-[14px] glass-field px-4 text-base outline-none placeholder:text-muted ${
      missingIt ? "ring-2 ring-flag" : "focus:ring-2 focus:ring-forest/60"
    }`;
  const flag = (on: boolean) => (on ? "ring-2 ring-flag" : "");
  const firstMissingPrice = job.line_items.find((i) => i.amount == null)?.id;
  const jumpTo = (m: (typeof missing)[number]) => {
    const id = m === "price" ? `f-price-${firstMissingPrice}` : m === "items" ? "f-add-line" : `f-${m}`;
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  };

  return (
    <Screen>
      <PageHeader backHref="/inicio" right={<JobActions job={job} setJob={setJob} />} />
      <Title>{job.customer_name || t.newJob}</Title>
      <p className="mt-1 text-sm text-muted">{serviceLabel(job.service, lang, job.service_es)}</p>

      {/* Ojo verdict — light; the missing FIELDS carry the highlight, tap an item to jump to it */}
      {missing.length ? (
        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-[14px] glass border-flag/60! px-4 py-3 text-sm">
          <Eye className="size-5 shrink-0 text-ojo" strokeWidth={1.75} />
          <span className="font-semibold text-ojo-ink">{t.ojoMissingN(missing.length)}:</span>
          {missing.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => jumpTo(m)}
              className="rounded-full bg-flag/15 px-2.5 py-0.5 font-semibold text-ojo-ink"
            >
              {t.missing[m]}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-5 flex items-center gap-2 rounded-[14px] glass-lime px-4 py-3 text-sm font-bold text-forest">
          <Check className="size-4" strokeWidth={3} /> {t.ojoReady}
        </p>
      )}

      {/* Customer */}
      <section className="mt-6 space-y-3">
        <label className="block">
          <FieldLabel text={t.customer} missingTag={missing.includes("customer") ? t.missingTag : null} />
          <input
            id="f-customer"
            className={field(missing.includes("customer"))}
            value={job.customer_name ?? ""}
            onChange={(e) => patch({ customer_name: e.target.value })}
            placeholder={t.namePlaceholder}
          />
        </label>
        <label className="block">
          <FieldLabel text={t.address} missingTag={missing.includes("address") ? t.missingTag : null} />
          <input
            id="f-address"
            className={field(missing.includes("address"))}
            value={job.address ?? ""}
            onChange={(e) => patch({ address: e.target.value })}
            placeholder={t.addressPlaceholder}
            autoComplete="street-address"
          />
        </label>
        {/* optional: never flagged by Ojo, only used for one-tap WhatsApp / SMS */}
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">
            {t.customerPhone} <span className="font-normal text-muted">· {t.optional}</span>
          </span>
          <input
            className={field(false)}
            value={job.customer_phone ?? ""}
            onChange={(e) => patch({ customer_phone: e.target.value })}
            placeholder={t.phonePlaceholder}
            type="tel"
            inputMode="tel"
            autoComplete="off"
          />
        </label>
      </section>

      {/* Line items */}
      <section className="mt-6">
        <FieldLabel text={t.work} missingTag={missing.includes("price") || missing.includes("items") ? t.missingTag : null} />
        <div className="rounded-[20px] glass p-2">
          {job.line_items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 border-b border-black/5 py-1 last:border-0">
              {/* Left column: Carlos's text + what the customer will read. Never runs under the price box. */}
              <div className="min-w-0 flex-1">
                <AutoTextarea
                  className="w-full rounded-[10px] bg-white/70 px-2.5 py-2.5 text-[15px] leading-5 outline-none focus:ring-2 focus:ring-forest/60"
                  value={spanish ? (item.description_es ?? item.description) : item.description}
                  onChange={(v) => {
                    if (!spanish) return setItem(item.id, { description: v, description_es: null, translation_pending: false });
                    edited.current.add(item.id);
                    setItem(item.id, { description_es: v });
                  }}
                  onBlur={(e) => {
                    // Carlos finished a line in Spanish → Mano writes the English the customer will see
                    // translate if he changed it, or retry if there's still no English
                    const changed = edited.current.delete(item.id);
                    if (!spanish || (!changed && item.description.trim())) return;
                    const es = e.currentTarget.value;
                    if (!es.trim()) return setItem(item.id, { description: "", translation_pending: false });
                    const en = toEnglish(es);
                    setItem(item.id, { description: en ?? "", translation_pending: en == null });
                  }}
                  placeholder={t.itemPlaceholder}
                  aria-label={t.itemPlaceholder}
                />
                {spanish && (item.description_es ?? "").trim() !== "" && (
                  <EnglishPreview
                    item={item}
                    onChange={(description) => setItem(item.id, { description })}
                    onDone={(description) => setItem(item.id, { description, translation_pending: !description.trim() })}
                  />
                )}
              </div>
              <label className={`flex h-10 w-[96px] shrink-0 items-center rounded-[10px] bg-white/70 px-2 ${flag(item.amount == null)}`}>
                <span className="text-sm font-bold text-muted">$</span>
                <input
                  id={`f-price-${item.id}`}
                  className="w-full bg-transparent text-right text-[15px] font-bold outline-none"
                  inputMode="decimal"
                  aria-label={`${item.description} — ${t.missing.price}`}
                  value={item.amount ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.]/g, "");
                    setItem(item.id, { amount: v === "" ? null : Number(v), price_source: "manual" });
                  }}
                  placeholder="0"
                />
              </label>
              <button type="button" onClick={() => removeItem(item.id)} aria-label={t.removeLine} className="mt-2.5 p-1 text-muted">
                <X className="size-4" />
              </button>
            </div>
          ))}
          <button id="f-add-line" type="button" onClick={() => addItem()} className="flex w-full items-center gap-1 px-2 py-3 text-sm font-semibold text-forest">
            <Plus className="size-4" strokeWidth={2.5} /> {t.addLine}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between px-2">
          <span className="text-base">{t.total}</span>
          <span className="text-2xl font-bold">{money(jobTotal(job))}</span>
        </div>
      </section>

      {/* Carlos skipped Ojo's questions for this job — one quiet line to bring them back */}
      {skipped && ask && (
        <p className="mt-6 flex items-center gap-2 rounded-[14px] border border-black/10 px-4 py-3 text-sm text-black/60">
          <Eye className="size-4 shrink-0 text-ojo" strokeWidth={1.75} />
          <span className="flex-1">{t.ojoSkipped(asks.length)}</span>
          <button type="button" onClick={() => patch({ ojo_skipped: false })} className="font-bold text-forest">
            {t.view}
          </button>
        </p>
      )}

      {/* Ojo: "forgot to charge?" — one question at a time, from the checklists of Carlos's trades (Paso 1) */}
      {!skipped && (ask || silenced.length > 0 || (job.ojo_dismissed?.length ?? 0) > 0) && (
        <section className={`mt-6 rounded-[20px] p-4 ${ask ? "glass border-peach!" : "glass-lime"}`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              {ask ? <Eye className="size-5 text-[#b8803f]" strokeWidth={1.75} /> : <Check className="size-5 text-forest" strokeWidth={3} />}
              {ask ? t.ojoAsks : t.ojoCheckedAll}
            </span>
            {ask && (
              <span className="flex items-center gap-1">
                {asks.length > 1 && <span className="text-xs font-semibold text-ojo-ink/70">{t.nMore(asks.length - 1)}</span>}
                <button
                  type="button"
                  onClick={() => patch({ ojo_skipped: true })}
                  aria-label={t.skipAllOjo}
                  title={t.skipAllOjo}
                  className="-mr-2 -mt-1 flex size-9 items-center justify-center rounded-full text-black/40 active:bg-black/5"
                >
                  <X className="size-5" />
                </button>
              </span>
            )}
          </div>

          {ask && (
            <div key={ask.key} className="motion-safe:animate-[pop-in_200ms_ease-out]">
              <p className="mt-3 font-serif text-[22px] leading-7">{ask[lang]}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => dismissAsk(ask.key)}
                  className="h-12 rounded-[14px] bg-white/70 text-base font-bold text-black/60 transition active:scale-[0.97]"
                >
                  {t.no}
                </button>
                <button
                  type="button"
                  onClick={() => acceptAsk(ask.key, ask.item, ask.item_es)}
                  className="h-12 rounded-[14px] bg-peach text-base font-bold text-ojo-ink transition active:scale-[0.97]"
                >
                  {t.yesAdd}
                </button>
              </div>
              <button
                type="button"
                onClick={() => alwaysIncluded(ask.key)}
                className="mx-auto mt-2 block px-2 py-1.5 text-xs font-semibold text-ojo-ink/70"
              >
                {t.neverAsk}
              </button>
            </div>
          )}

          {/* Undo for "No volver a preguntar" — quiet, inside the same card */}
          {silenced.length > 0 && (
            <p className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-black/50 ${ask ? "mt-1 border-t border-black/10 pt-2" : "mt-2"}`}>
              {t.ojoIgnoredTitle}:
              {silenced.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => askAgain(c.key)}
                  aria-label={`${t.askAgain}: ${c.label[lang]}`}
                  className="font-semibold text-forest underline underline-offset-2"
                >
                  {c.label[lang]} ↺
                </button>
              ))}
            </p>
          )}
        </section>
      )}

      {/* Original words */}
      {job.description && (
        <section className="mt-6 flex gap-2 text-sm italic text-black/60">
          <Quote className="size-4 shrink-0" />
          <p>
            <span className="not-italic font-semibold text-black/70">{t.whatYouSaid}: </span>
            {job.description}
          </p>
        </section>
      )}

      <div className="mt-auto pt-8">
        {missing.length > 0 && (
          <p className="mb-2 text-center text-sm font-semibold text-ojo-ink">{t.completeFirst(missing.map((m) => t.missing[m]))}</p>
        )}
        <button
          type="button"
          disabled={missing.length > 0}
          onClick={() => router.push(`/trabajos/${job.id}/estimado`)}
          className={btnPrimary}
        >
          <FileText className="size-5" strokeWidth={2.25} />
          {t.generateQuote} →
        </button>
        {/* quick jobs / work already done: skip the estimate */}
        <button
          type="button"
          disabled={missing.length > 0}
          onClick={() => router.push(`/trabajos/${job.id}/factura`)}
          className={`${btnGhost} disabled:opacity-40`}
        >
          <Receipt className="size-4" strokeWidth={2.25} />
          {t.invoiceWithoutEstimate}
        </button>
      </div>
    </Screen>
  );
}

/* ───────── After the quote: follow the workflow ───────── */

function TrackJob({ job, setJob }: { job: Job; setJob: (j: Job) => void }) {
  const { t, lang } = useLang();
  const step = STATUS_FLOW.indexOf(job.status);
  const next = nextStatus(job.status);
  const canMessage = job.status === "QUOTE_SENT" || job.status === "PAYMENT_PENDING";
  // Estimate out, no answer for 2+ days (same rule as Ojo): following up becomes the main job
  const quoteStale = job.status === "QUOTE_SENT" && daysSince(job.updated_at) >= 2;

  const advance = async () => {
    if (next) setJob(await setStatus(job.id, next));
  };

  return (
    <Screen>
      <PageHeader backHref="/trabajos" right={<JobActions job={job} setJob={setJob} />} />
      <Title>{job.customer_name}</Title>
      <p className="mt-1 text-sm text-muted">{serviceLabel(job.service, lang, job.service_es)}</p>

      {job.status === "ACCEPTED" && (
        <section className="mt-5 rounded-[24px] glass-lime p-5 motion-safe:animate-[pop-in_300ms_ease-out]">
          <div className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-forest">
              <PartyPopper className="size-6 text-lime" />
            </span>
            <div className="min-w-0">
              <p className="font-serif text-[26px] leading-7 tracking-[-0.5px] text-forest">
                {t.approvedHero(firstName(job.customer_name))}
              </p>
              <p className="mt-1 text-2xl font-bold text-forest">{money(jobTotal(job))}</p>
            </div>
          </div>
          {job.approved_by && (
            <div className="mt-4 rounded-[14px] bg-white/70 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[1.2px] text-forest/70">{t.signedAs}</p>
              <p className="font-serif text-xl italic text-forest">{job.approved_by}</p>
              {job.approved_at && <p className="text-xs text-forest/70">{fmtDate(job.approved_at, lang)}</p>}
            </div>
          )}
          <p className="mt-3 text-sm font-semibold text-forest">{t.approvedNext}</p>
        </section>
      )}

      {job.status === "CANCELLED" ? (
        <div className="mt-5 flex items-center gap-2 rounded-[14px] bg-black/5 px-4 py-3 text-sm">
          <Archive className="size-5 shrink-0 text-black/50" />
          <span>
            <span className="font-semibold">{job.cancel_reason && t.reasons[job.cancel_reason]}</span>
            {job.cancelled_at && <span className="block text-xs text-muted">{t.cancelledOn(fmtDate(job.cancelled_at, lang))}</span>}
          </span>
        </div>
      ) : (
        <div className="mt-5 flex gap-1" aria-hidden>
          {STATUS_FLOW.slice(1).map((s, i) => (
            <span key={s} className={`h-[4px] flex-1 rounded-full ${i < step ? "bg-forest" : "bg-track"}`} />
          ))}
        </div>
      )}

      <section className="mt-6 rounded-[20px] glass p-5">
        {job.address && <p className="text-sm text-muted">{job.address}</p>}
        {/* phone can still be added after sending (for reminders) */}
        {job.status !== "CANCELLED" && job.status !== "PAID" && (
          <label className="mt-2 flex items-center gap-2 rounded-[10px] bg-white/60 px-3 py-2 text-sm">
            <Phone className="size-4 shrink-0 text-muted" />
            <input
              defaultValue={job.customer_phone ?? ""}
              onBlur={async (e) => {
                const v = e.currentTarget.value.trim();
                if (v !== (job.customer_phone ?? "")) setJob(await updateJob(job.id, { customer_phone: v || null }));
              }}
              placeholder={`${t.customerPhone} · ${t.optional}`}
              aria-label={t.customerPhone}
              type="tel"
              inputMode="tel"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
            />
          </label>
        )}
        <ul className="mt-3 space-y-1.5 text-[15px]">
          {job.line_items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4">
              <span>{lang === "es" ? (i.description_es ?? i.description) : i.description}</span>
              <span className="font-bold">{money(i.amount ?? 0)}</span>
            </li>
          ))}
        </ul>
        <hr className="my-4 border-black/10" />
        <div className="flex items-center justify-between">
          <span>{t.total}</span>
          <span className="text-2xl font-bold">{money(jobTotal(job))}</span>
        </div>
        <div className="mt-4 space-y-2">
          {job.estimate_number && (
            <DocLink href={`/trabajos/${job.id}/estimado`} label={t.viewQuote} number={estimateNo(job.estimate_number)} />
          )}
          {job.invoice_number && (
            <DocLink
              href={`/trabajos/${job.id}/factura`}
              label={t.viewInvoice}
              number={invoiceNo(job.invoice_number)}
              state={invoiceState(job)}
            />
          )}
        </div>
      </section>

      {job.status === "QUOTE_SENT" && (
        <div className="mt-4">
          <ShareEstimate job={job} quiet={quoteStale} />
        </div>
      )}

      {/* Later stages: a quiet record of who approved */}
      {job.approved_by && job.approved_at && job.status !== "CANCELLED" && job.status !== "ACCEPTED" && (
        <p className="mt-4 flex items-center gap-2 rounded-[14px] glass-lime px-4 py-3 text-sm font-semibold text-forest">
          <Check className="size-4 shrink-0" strokeWidth={3} />
          {t.approvedByOn(job.approved_by, fmtDate(job.approved_at, lang))}
        </p>
      )}

      <div className="mt-auto space-y-3 pt-8">
        {job.status === "CANCELLED" ? (
          <button type="button" onClick={async () => setJob(await reactivateJob(job.id))} className={btnPrimary}>
            <RotateCcw className="size-5" strokeWidth={2.25} />
            {t.reactivate}
          </button>
        ) : job.status === "PAID" ? (
          <OjoNote>
            <span className="font-bold text-forest">{t.paidDone}</span>
          </OjoNote>
        ) : job.status === "QUOTE_SENT" ? (
          // Sending lives in the share box above. Here: follow up (main only once it's stale),
          // and a small link for when the customer said yes outside the app.
          <>
            <Link href={`/trabajos/${job.id}/seguimiento`} className={quoteStale ? btnPrimary : btnSecondary}>
              <MessageCircle className="size-5" strokeWidth={2.25} />
              {t.followUp}
            </Link>
            <button type="button" onClick={advance} className={btnGhost}>
              {t.markAcceptedLink}
            </button>
          </>
        ) : (
          <>
            {canMessage && (
              <Link href={`/trabajos/${job.id}/seguimiento`} className={btnLime}>
                <MessageCircle className="size-5" strokeWidth={2.25} />
                {job.status === "PAYMENT_PENDING" ? t.sendReminder : t.followUp}
              </Link>
            )}
            {job.status === "COMPLETED" ? (
              <Link href={`/trabajos/${job.id}/factura`} className={btnPrimary}>
                <Receipt className="size-5" strokeWidth={2.25} />
                {t.sendInvoice} →
              </Link>
            ) : job.status === "PAYMENT_PENDING" ? (
              <button type="button" onClick={async () => setJob(await markPaid(job.id))} className={btnPrimary}>
                {t.markPaid} →
              </button>
            ) : (
              next &&
              t.nextStep[job.status] && (
                <button type="button" onClick={advance} className={btnPrimary}>
                  {t.nextStep[job.status]} →
                </button>
              )
            )}
          </>
        )}
      </div>
    </Screen>
  );
}

function DocLink({ href, label, number, state }: { href: string; label: string; number?: string | null | 0; state?: InvoiceState | null }) {
  const { t } = useLang();
  return (
    <Link href={href} className="flex items-center gap-2 rounded-[12px] bg-white/60 px-3 py-2.5 text-sm font-semibold text-forest">
      <FileText className="size-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {number && <span className="font-mono text-xs text-black/70">{number}</span>}
      {state && <DocStateBadge state={state} label={t.docState[state]} />}
    </Link>
  );
}

/* ───────── Status badge + "⋯" menu: delete drafts, cancel sent jobs ───────── */

function JobActions({ job, setJob }: { job: Job; setJob: (j: Job) => void }) {
  const { t } = useLang();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<"delete" | "cancel" | null>(null);
  const [reason, setReason] = useState<CancelReason>("declined");
  const name = firstName(job.customer_name);
  const deletable = canDelete(job);
  const cancellable = canCancel(job);

  const confirmDelete = async () => {
    await deleteJob(job.id);
    router.push("/trabajos");
  };

  const confirmCancel = async () => {
    setJob(await cancelJob(job.id, reason));
    setSheet(null);
  };

  return (
    <div className="relative flex items-center gap-2">
      <StatusBadge status={job.status} />
      {(deletable || cancellable) && (
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-label={t.moreOptions}
          aria-expanded={menu}
          className="-mr-1 flex size-10 items-center justify-center rounded-full active:bg-black/5"
        >
          <Ellipsis className="size-6" />
        </button>
      )}

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
          <div role="menu" className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-[16px] glass-paper py-1">
            {deletable && (
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setMenu(false);
                  setSheet("delete");
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-semibold text-[#8a2a17] active:bg-black/5"
              >
                <Trash2 className="size-5" /> {t.deleteJob}
              </button>
            )}
            {cancellable && (
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setMenu(false);
                  setSheet("cancel");
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-semibold active:bg-black/5"
              >
                <Archive className="size-5" /> {t.cancelJob}
              </button>
            )}
          </div>
        </>
      )}

      <Sheet open={sheet === "delete"} onClose={() => setSheet(null)} title={t.deleteTitle(name)}>
        <p className="mt-2 text-base leading-6 text-black/70">{t.deleteBody}</p>
        <div className="mt-6 space-y-1">
          <button type="button" onClick={confirmDelete} className={btnDanger}>
            <Trash2 className="size-5" /> {t.deleteYes}
          </button>
          <button type="button" onClick={() => setSheet(null)} className={btnGhost}>
            {t.goBack}
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === "cancel"} onClose={() => setSheet(null)} title={t.cancelTitle}>
        <p className="mt-2 text-sm leading-5 text-black/70">{t.cancelBody}</p>
        <div role="radiogroup" className="mt-5 space-y-2">
          {CANCEL_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className={`flex h-[56px] w-full items-center justify-between rounded-[16px] px-4 text-left text-base font-semibold transition ${
                reason === r ? "bg-forest text-white" : "bg-white text-black"
              }`}
            >
              {t.reasons[r]}
              {reason === r && (
                <span className="flex size-6 items-center justify-center rounded-full bg-lime">
                  <Check className="size-4 text-forest" strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-6 space-y-1">
          <button type="button" onClick={confirmCancel} className={btnPrimary}>
            <Archive className="size-5" /> {t.cancelYes}
          </button>
          <button type="button" onClick={() => setSheet(null)} className={btnGhost}>
            {t.goBack}
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function FieldLabel({ text, missingTag }: { text: string; missingTag: string | null }) {
  return (
    <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
      {text}
      {missingTag && <span className="rounded-full bg-flag/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ojo-ink">{missingTag}</span>}
    </span>
  );
}

/** Under each Spanish line: what the customer will read. Editable; asks for English if Mano couldn't translate. */
function EnglishPreview({
  item,
  onChange,
  onDone,
}: {
  item: LineItem;
  onChange: (en: string) => void;
  onDone: (en: string) => void;
}) {
  const { t } = useLang();
  const needsEnglish = item.translation_pending || !item.description.trim();
  const [editing, setEditing] = useState(false);

  if (needsEnglish || editing) {
    return (
      <div className={`mb-1.5 rounded-[12px] px-3 py-2 text-xs ${needsEnglish ? "bg-flag/15 text-ojo-ink" : "bg-white/60 text-black/70"}`}>
        {needsEnglish && <p className="mb-1 font-semibold">{t.cantTranslate}</p>}
        <div className="flex items-start gap-2">
          <AutoTextarea
            lang="en"
            autoFocus={editing}
            value={item.description}
            onChange={onChange}
            onBlur={(e) => {
              onDone(e.currentTarget.value);
              setEditing(false);
            }}
            placeholder={t.englishPlaceholder}
            aria-label={t.englishPlaceholder}
            className={`min-w-0 flex-1 rounded-[8px] bg-white px-2 py-1.5 text-[13px] leading-4 outline-none ${needsEnglish ? "ring-2 ring-flag" : "ring-1 ring-black/10"}`}
          />
          {editing && !needsEnglish && (
            <button type="button" className="py-1.5 font-bold text-forest">
              {t.englishDone}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <p
      onClick={() => setEditing(true)}
      className="flex cursor-text items-start gap-1.5 px-2.5 pb-1.5 pt-1 text-xs leading-4 text-black/45"
    >
      <span className="shrink-0 font-mono text-[10px] uppercase leading-4 tracking-wide">EN</span>
      <span lang="en">{item.description}</span>
    </p>
  );
}
