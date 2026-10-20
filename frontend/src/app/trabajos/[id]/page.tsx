"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Archive, CalendarDays, Check, Database, Ellipsis, Eye, PartyPopper, Pencil, Phone, FileText, MessageCircle, Plus, Quote, Receipt, RotateCcw, Trash2, X, MapPin, UserRound } from "lucide-react";
import { AutoTextarea, DocStateBadge, PageHeader, Screen, Sheet, StatusBadge, Title, btnDanger, btnGhost, btnPrimary, btnSage, btnSecondary } from "@/components/ui";
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
  lineAmount,
  priceLine,
  quantityLabel,
  isLumpSum,
  isUnsent,
  addPayment,
  removePayment,
  balanceDue,
  paidSoFar,
  PAYMENT_METHODS,
  type PaymentMethod,
  money,
  nextStatus,
  setStatus,
  uid,
  updateContact,
  updateJob,
  phoneDigits,
  type InvoiceState,
  type Job,
  type LineItem,
  daysSince,
  isInvoiceJob,
  jobSites,
  linesBySite,
  defaultDue,
  dueDay,
  invoiceNumberTaken,
  peekInvoiceNumber,
  setInvoiceDue,
  setInvoiceNumber,
} from "@/lib/api";
import { ShareEstimate } from "@/components/share-estimate";
import { JobFiles } from "@/components/job-files";
import { DocumentCard } from "@/components/document";
import { DEMO_BUSINESS, loadBusiness, rememberNameFix, saveBusiness, type Business } from "@/lib/business";
import { useLang } from "@/lib/i18n";
import { toEnglish } from "@/lib/translate";
import { serviceLabel } from "@/lib/services";
import { needsAiQuestions, ojoTradeFor, silencedFor, suggestions, validate } from "@/lib/ojo";
import { ojoQuestions } from "@/lib/mano";
import { formatPhone, nextPhone } from "@/lib/phone";

const EDITABLE = ["NEW", "NEEDS_INFORMATION", "READY_FOR_QUOTE"];

/** A typed price or quantity. Empty stays empty; "12." is 12, same as the amount box. */
function numFrom(raw: string): number | null {
  const v = raw.replace(/[^\d.]/g, "");
  if (v === "" || v === ".") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

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
  const sites = jobSites(job); // several houses on one job (company client)
  const [biz, setBiz] = useState<Business | null>(null);
  useEffect(() => setBiz(loadBusiness()), []);
  // Trades without a built-in checklist: ask Gemini once for this job, then keep the answer on the job
  const askedAi = useRef(false);
  // questions are off unless he turned them on (missing info and next steps always work)
  const ojoOn = !!biz?.ojoQuestions;
  useEffect(() => {
    if (!biz?.ojoQuestions || askedAi.current || job.ojo_ai !== undefined || job.ojo_skipped || !needsAiQuestions(job, biz)) return;
    if (!job.line_items.length && !job.description.trim()) return;
    askedAi.current = true;
    const trade = ojoTradeFor(job, biz, t.trades); // the job's own type, so a junk-removal or auto job gets its own questions
    ojoQuestions(job, trade).then((questions) => {
      if (questions) updateJob(job.id, { ojo_ai: questions }).then(setJob);
    });
  }, [biz, job, setJob, t]);
  const asks = ojoOn ? suggestions(job, biz) : [];
  const silenced = ojoOn ? silencedFor(job, biz) : [];
  const ask = asks[0]; // one question at a time
  const skipped = !!job.ojo_skipped; // ✕ on the card: skip all of Ojo's questions for this job
  const spanish = lang === "es"; // Carlos edits in Spanish; the estimate is always English
  const edited = useRef(new Set<string>()); // lines whose Spanish changed since the last translation
  // lines he opened "precio por cantidad" on, before any number is saved
  const [qtyOn, setQtyOn] = useState<Record<string, true>>({});

  const patch = (p: Partial<Job>) => {
    const next = { ...job, ...p };
    setJob(next);
    updateJob(job.id, p).then(setJob);
  };
  const setItem = (itemId: string, p: Partial<LineItem>) =>
    patch({ line_items: job.line_items.map((i) => (i.id === itemId ? priceLine(i, p) : i)) });
  const measured = (item: LineItem) => !!qtyOn[item.id] || item.quantity != null || item.unit_price != null || !!item.unit?.trim();
  const oneAmount = (item: LineItem) => {
    setQtyOn((m) => {
      const next = { ...m };
      delete next[item.id];
      return next;
    });
    setItem(item.id, { quantity: null, unit: null, unit_price: null });
  };
  const addItem = () => patch({ line_items: [...job.line_items, { id: uid(), description: "", description_es: "", amount: null }] });
  // "Sí, agregar" opens a price step in the same card: an amount, or "ya está incluido"
  const [pricing, setPricing] = useState<{ key: string; item: string; item_es: string } | null>(null);
  const [extra, setExtra] = useState("");
  const extraAmount = Number(extra) > 0 ? Number(extra) : null;
  const acceptAsk = (key: string, description: string, description_es: string, amount: number | null) => {
    const lump = isLumpSum(job);
    patch({
      // one total: the item has no own price and the amount is added to the total;
      // price per line: the item gets the amount (0 = included, shown as "Incluido")
      line_items: [...job.line_items, { id: uid(), description, description_es, amount: lump ? null : (amount ?? 0) }],
      ...(lump && amount ? { job_total: (job.job_total ?? 0) + amount } : {}),
      ojo_dismissed: [...(job.ojo_dismissed ?? []), key],
    });
    setPricing(null);
    setExtra("");
  };
  const dismissAsk = (key: string) => patch({ ojo_dismissed: [...(job.ojo_dismissed ?? []), key] });
  const setIgnore = (ojoIgnore: string[]) => {
    saveBusiness({ ojoIgnore });
    setBiz((b) => (b ? { ...b, ojoIgnore } : b));
  };
  const alwaysIncluded = (key: string) => {
    // Gemini's questions have no built-in label: keep one so "Tu negocio" can list it
    const ai = job.ojo_ai?.find((q) => q.key === key);
    if (ai) saveBusiness({ ojoIgnoreLabels: { ...(biz?.ojoIgnoreLabels ?? {}), [key]: { es: ai.item_es, en: ai.item } } });
    setIgnore([...(biz?.ojoIgnore ?? []), key]);
  };
  const askAgain = (key: string) => setIgnore((biz?.ojoIgnore ?? []).filter((k) => k !== key));
  const removeItem = (itemId: string) => patch({ line_items: job.line_items.filter((i) => i.id !== itemId) });

  // ONE "missing" style everywhere: amber outline (+ a "falta" tag next to the label, so it's not color-only)
  const field = (missingIt: boolean) =>
    `h-[52px] w-full rounded-[14px] glass-field px-4 text-base outline-none placeholder:text-muted ${
      missingIt ? "ring-2 ring-flag" : "focus:ring-2 focus:ring-forest/60"
    }`;
  const flag = (on: boolean) => (on ? "ring-2 ring-flag" : "");
  const firstMissingPrice = job.line_items.find((i) => lineAmount(i) == null)?.id;
  const lump = isLumpSum(job); // one price for the whole job: items list the work, the total is typed once
  // The note's own "Total" lines vs. the item prices: fine if they match the grand total or one of the totals
  const noteTotals = lump ? [] : (job.note_totals ?? []);
  const noteSum = noteTotals.reduce((s, n) => s + n, 0);
  const totalsOff = noteTotals.length > 0 && jobTotal(job) !== noteSum && !noteTotals.includes(jobTotal(job));
  const jumpTo = (m: (typeof missing)[number]) => {
    const id = m === "price" ? (lump ? "f-job-total" : `f-price-${firstMissingPrice}`) : m === "items" ? "f-add-line" : `f-${m}`;
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  };

  return (
    <WithPreview job={job}>
      {/* three regions: phone = head, job, actions (bottom); desktop = head, actions, job (see WithPreview) */}
      <div className="[grid-area:head]">
        <PageHeader backHref="/inicio" right={<JobActions job={job} setJob={setJob} />} />
        <Title>{job.customer_name || t.newJob}</Title>
        <p className="mt-1 text-sm text-muted">{serviceLabel(job.service, lang, job.service_es)}</p>
        <SyncNote job={job} />
      </div>
      <div className="flex min-w-0 flex-col [grid-area:body]">

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
        <p className="mt-5 flex items-center gap-2 rounded-[14px] glass-sage px-4 py-3 text-sm font-bold text-forest">
          <Check className="size-4" strokeWidth={3} /> {isInvoiceJob(job) ? t.ojoReadyInvoice : t.ojoReady}
        </p>
      )}

      {/* Invoice: number and due date up front, like the top of an invoice (Wave puts them here too) */}
      {isInvoiceJob(job) && <InvoiceDetails job={job} setJob={setJob} />}

      {/* Customer */}
      <section className="mt-6 space-y-3">
        <label className="block">
          <FieldLabel text={t.customer} missingTag={missing.includes("customer") ? t.missingTag : null} />
          <input
            id="f-customer"
            className={field(missing.includes("customer"))}
            value={job.customer_name ?? ""}
            onChange={(e) => patch({ customer_name: e.target.value })}
            // Carlos fixed the name by hand → next time Mano hears it the same way, use his spelling
            onBlur={(e) => rememberNameFix(job.customer_name_heard, e.currentTarget.value)}
            placeholder={t.namePlaceholder}
          />
        </label>
        {job.client_match && (
          // Mano recognized a client he already has; ✕ = not them, put back what the note said
          <div className="-mt-1 flex items-center gap-2 rounded-[12px] glass-sage px-3 py-2 text-sm text-forest">
            <UserRound className="size-4 shrink-0" strokeWidth={2.25} />
            <span className="min-w-0 flex-1">
              <b>{t.savedClient}</b>
              {job.client_match.filled.length > 0 && <span className="text-forest/80"> · {t.savedClientFilled(job.client_match.filled.map((f) => t.clientFields[f]))}</span>}
            </span>
            <button
              type="button"
              onClick={() =>
                patch({
                  customer_name: job.client_match!.heard,
                  ...Object.fromEntries(job.client_match!.filled.map((f) => [f, null])),
                  client_match: null,
                })
              }
              aria-label={t.notThisClient}
              className="shrink-0 p-1 text-forest/70"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        {/* Mano's spelling fix — only a suggestion; one tap to accept, and it's remembered */}
        {job.customer_name_suggested && job.customer_name_suggested !== job.customer_name && (
          <div className="-mt-1 flex items-center gap-2 rounded-[12px] glass-peach px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
              {t.didYouMean} <b>{job.customer_name_suggested}</b>?
            </span>
            <button
              type="button"
              onClick={() => {
                rememberNameFix(job.customer_name_heard ?? job.customer_name, job.customer_name_suggested);
                patch({ customer_name: job.customer_name_suggested, customer_name_suggested: null });
              }}
              className="shrink-0 rounded-full bg-forest px-3 py-1.5 text-xs font-bold text-white"
            >
              {t.yesChange}
            </button>
            <button type="button" onClick={() => patch({ customer_name_suggested: null })} aria-label={t.close} className="shrink-0 p-1 text-ojo-ink">
              <X className="size-4" />
            </button>
          </div>
        )}
        <label className="block">
          <FieldLabel
            text={sites.length ? t.billingAddress : t.address}
            hint={sites.length ? t.optional : undefined} // several houses: the lines have the addresses
            missingTag={missing.includes("address") ? t.missingTag : null}
          />
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
            onChange={(e) => patch({ customer_phone: nextPhone(job.customer_phone ?? "", e.target.value) })}
            placeholder={t.phonePlaceholder}
            type="tel"
            inputMode="tel"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">
            {t.clientEmail} <span className="font-normal text-muted">· {t.optional}</span>
          </span>
          <input
            className={field(false)}
            value={job.customer_email ?? ""}
            onChange={(e) => patch({ customer_email: e.target.value || null })}
            type="email"
            inputMode="email"
            autoComplete="off"
          />
        </label>
      </section>

      {/* Line items */}
      <section className="mt-6">
        {/* pick one of the job's houses when typing a line's site */}
        <datalist id="job-sites">
          {sites.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <FieldLabel text={t.work} missingTag={missing.includes("price") || missing.includes("items") ? t.missingTag : null} />
        <div className="rounded-[20px] glass p-2">
          {job.line_items.map((item) => (
            <div
              key={item.id}
              className={`border-b border-black/5 py-1 last:border-0 ${lump ? "flex items-start gap-2" : "grid grid-cols-[minmax(0,1fr)_96px_auto] items-start gap-x-2 gap-y-1.5"}`}
            >
              {/* Left column: Carlos's text. Same width on every line, so quantity sits under the description. */}
              <div className="min-w-0 flex-1">
                <AutoTextarea
                  className="w-full rounded-[10px] bg-ivory px-2.5 py-2.5 text-[15px] leading-5 outline-none focus:ring-2 focus:ring-forest/60"
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
                {sites.length > 0 && (
                  // several houses: which one this line is for (empty = no site)
                  <label className="mt-1 flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-xs text-muted focus-within:bg-ivory">
                    <MapPin className="size-3 shrink-0" />
                    <input
                      className="min-w-0 flex-1 bg-transparent outline-none"
                      value={item.site ?? ""}
                      onChange={(e) => setItem(item.id, { site: e.target.value || null })}
                      placeholder={t.sitePlaceholder}
                      aria-label={t.sitePlaceholder}
                      list="job-sites"
                    />
                  </label>
                )}
                {spanish && (item.description_es ?? "").trim() !== "" && (
                  <EnglishPreview
                    item={item}
                    onChange={(description) => setItem(item.id, { description })}
                    onDone={(description) => setItem(item.id, { description, translation_pending: !description.trim() })}
                  />
                )}
                {!lump && !measured(item) && (
                  <button
                    type="button"
                    onClick={() => setQtyOn((m) => ({ ...m, [item.id]: true }))}
                    className="mt-0.5 flex min-h-10 items-center px-2.5 text-left text-sm font-semibold text-forest"
                  >
                    {t.byQuantity}
                  </button>
                )}
              </div>
              {!lump &&
                (measured(item) ? (
                  // same price column as every other line; the number is quantity × unit price
                  <div className={`flex h-10 items-center rounded-[10px] bg-ivory px-2 ${flag(lineAmount(item) == null)}`}>
                    <span className="text-sm font-bold text-muted">$</span>
                    <span className="w-full truncate text-right text-[15px] font-bold tabular-nums">{lineAmount(item) ?? ""}</span>
                  </div>
                ) : (
                  <label className={`flex h-10 items-center rounded-[10px] bg-ivory px-2 ${flag(lineAmount(item) == null)}`}>
                    <span className="text-sm font-bold text-muted">$</span>
                    <input
                      id={`f-price-${item.id}`}
                      className="w-full bg-transparent text-right text-[15px] font-bold tabular-nums outline-none"
                      inputMode="decimal"
                      aria-label={`${item.description} — ${t.missing.price}`}
                      value={item.amount ?? ""}
                      onChange={(e) => setItem(item.id, { amount: numFrom(e.target.value), price_source: "manual" })}
                      placeholder="0"
                    />
                  </label>
                ))}
              <button type="button" onClick={() => removeItem(item.id)} aria-label={t.removeLine} className="mt-2.5 p-1 text-muted">
                <X className="size-4" />
              </button>
              {!lump && measured(item) && (
                <>
                  {/* quantity and unit fill the description column; × sits against the price column */}
                  <div>
                    <div className="flex h-10 items-center gap-1.5 md:justify-end">
                      <input
                        id={item.quantity == null ? `f-price-${item.id}` : undefined}
                        className={`h-10 min-w-0 flex-1 rounded-[10px] bg-ivory px-2 text-right text-[15px] font-bold tabular-nums outline-none focus:ring-2 focus:ring-forest/60 md:w-[4.75rem] md:flex-none ${flag(lineAmount(item) == null && item.quantity == null)}`}
                        inputMode="decimal"
                        aria-label={t.quantity}
                        value={item.quantity ?? ""}
                        onChange={(e) => setItem(item.id, { quantity: numFrom(e.target.value) })}
                        placeholder="0"
                      />
                      <input
                        className="h-10 min-w-0 flex-1 rounded-[10px] bg-ivory px-2 text-[15px] outline-none focus:ring-2 focus:ring-forest/60 md:w-[4.25rem] md:flex-none"
                        aria-label={t.unit}
                        value={item.unit ?? ""}
                        onChange={(e) => setItem(item.id, { unit: e.target.value.slice(0, 16) || null })}
                        placeholder={t.unitPlaceholder}
                      />
                      <span className="shrink-0 text-sm font-bold text-muted" aria-hidden>
                        ×
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => oneAmount(item)}
                      className="mt-0.5 flex min-h-10 items-center px-2.5 text-left text-sm font-semibold text-forest"
                    >
                      {t.oneAmount}
                    </button>
                  </div>
                  <label className={`flex h-10 items-center rounded-[10px] bg-ivory px-2 focus-within:ring-2 focus-within:ring-forest/60 ${flag(lineAmount(item) == null && item.unit_price == null)}`}>
                    <span className="text-sm font-bold text-muted">$</span>
                    <input
                      id={item.quantity != null && item.unit_price == null ? `f-price-${item.id}` : undefined}
                      className="w-full bg-transparent text-right text-[15px] font-bold tabular-nums outline-none"
                      inputMode="decimal"
                      aria-label={t.unitPrice}
                      value={item.unit_price ?? ""}
                      onChange={(e) => setItem(item.id, { unit_price: numFrom(e.target.value) })}
                      placeholder="0"
                    />
                  </label>
                </>
              )}
            </div>
          ))}
          <button id="f-add-line" type="button" onClick={() => addItem()} className="flex w-full items-center gap-1 px-2 py-3 text-sm font-semibold text-forest">
            <Plus className="size-4" strokeWidth={2.5} /> {t.addLine}
          </button>
        </div>
        {lump ? (
          <div className="mt-3 px-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="f-job-total" className="text-base">{t.jobTotal}</label>
              <span className={`flex h-12 w-[140px] items-center rounded-[12px] bg-ivory px-3 ${flag(!(job.job_total! > 0))}`}>
                <span className="font-bold text-muted">$</span>
                <input
                  id="f-job-total"
                  className="w-full bg-transparent text-right text-2xl font-bold outline-none"
                  inputMode="decimal"
                  value={job.job_total || ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.]/g, "");
                    patch({ job_total: v === "" ? 0 : Number(v) });
                  }}
                  placeholder="0"
                />
              </span>
            </div>
            {(spanish ? job.price_note_es || job.price_note : job.price_note) && (
              <p className="mt-1 text-right text-sm text-muted">{spanish ? job.price_note_es || job.price_note : job.price_note}</p>
            )}
            <button type="button" onClick={() => patch({ job_total: null })} className="mt-2 text-sm font-semibold text-forest underline underline-offset-4">
              {t.pricePerLine}
            </button>
          </div>
        ) : (
          <div className="mt-3 px-2">
            <div className="flex items-center justify-between">
              <span className="text-base">{t.total}</span>
              <span className="text-2xl font-bold">{money(jobTotal(job))}</span>
            </div>
            {totalsOff && (
              <p role="status" className="mt-2 flex items-start gap-1.5 rounded-[12px] bg-flag/15 px-3 py-2 text-sm text-ojo-ink">
                <Eye className="mt-0.5 size-4 shrink-0 text-ojo" strokeWidth={1.75} />
                {t.totalsOff(money(jobTotal(job)), noteTotals.map(money).join(" + "))}
              </p>
            )}
            {job.line_items.length > 1 && (
              <button type="button" onClick={() => patch({ job_total: jobTotal(job) })} className="mt-2 text-sm font-semibold text-forest underline underline-offset-4">
                {t.useOneTotal}
              </button>
            )}
          </div>
        )}
      </section>

      {/* Carlos skipped Ojo's questions for this job — one quiet line to bring them back */}
      {skipped && ask && (
        <p className="mt-6 flex items-center gap-2 rounded-[14px] border border-black/10 px-4 py-3 text-sm text-charcoal/60">
          <Eye className="size-4 shrink-0 text-ojo" strokeWidth={1.75} />
          <span className="flex-1">{t.ojoSkipped(asks.length)}</span>
          <button type="button" onClick={() => patch({ ojo_skipped: false })} className="font-bold text-forest">
            {t.view}
          </button>
        </p>
      )}

      {/* Ojo: "forgot to charge?" — one question at a time, from the checklists of Carlos's trades (Paso 1) */}
      {ojoOn && !skipped && (ask || silenced.length > 0 || (job.ojo_dismissed?.length ?? 0) > 0) && (
        <section className={`mt-6 rounded-[20px] p-4 ${ask ? "glass border-peach!" : "glass-sage"}`}>
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
                  className="-mr-2 -mt-1 flex size-9 items-center justify-center rounded-full text-charcoal/40 active:bg-black/5"
                >
                  <X className="size-5" />
                </button>
              </span>
            )}
          </div>

          {ask && pricing?.key === ask.key && (
            <div key={`${ask.key}-price`} className="motion-safe:animate-[pop-in_200ms_ease-out]">
              <p className="mt-3 text-sm font-semibold text-ojo-ink">{lang === "es" ? ask.item_es : ask.item}</p>
              <label htmlFor="f-ojo-price" className="mt-1 block font-serif text-[22px] leading-7">
                {t.howMuch}
              </label>
              <span className="mt-3 flex h-12 items-center rounded-[14px] bg-white/80 px-3 ring-forest/60 focus-within:ring-2">
                <span className="font-bold text-muted">$</span>
                <input
                  id="f-ojo-price"
                  autoFocus
                  inputMode="decimal"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0"
                  className="w-full bg-transparent text-right text-xl font-bold outline-none"
                />
              </span>
              {isLumpSum(job) && extraAmount && (
                <p className="mt-1.5 text-right text-xs text-charcoal/60">{t.newTotal(money((job.job_total ?? 0) + extraAmount))}</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => acceptAsk(ask.key, ask.item, ask.item_es, null)}
                  className="h-12 rounded-[14px] bg-ivory px-2 text-sm font-bold leading-4 text-charcoal/70 transition active:scale-[0.97]"
                >
                  {t.alreadyIncluded}
                </button>
                <button
                  type="button"
                  disabled={!extraAmount}
                  onClick={() => acceptAsk(ask.key, ask.item, ask.item_es, extraAmount)}
                  className="h-12 rounded-[14px] bg-forest text-base font-bold text-white transition active:scale-[0.97] disabled:opacity-40"
                >
                  {t.add}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPricing(null);
                  setExtra("");
                }}
                className="mx-auto mt-2 block px-2 py-1.5 text-xs font-semibold text-ojo-ink/70"
              >
                {t.back}
              </button>
            </div>
          )}

          {ask && pricing?.key !== ask.key && (
            <div key={ask.key} className="motion-safe:animate-[pop-in_200ms_ease-out]">
              <p className="mt-3 font-serif text-[22px] leading-7">{ask[lang]}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => dismissAsk(ask.key)}
                  className="h-12 rounded-[14px] bg-ivory text-base font-bold text-charcoal/60 transition active:scale-[0.97]"
                >
                  {t.no}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExtra("");
                    setPricing({ key: ask.key, item: ask.item, item_es: ask.item_es });
                  }}
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
            <p className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-charcoal/50 ${ask ? "mt-1 border-t border-black/10 pt-2" : "mt-2"}`}>
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

      {/* Photos & files: the client sees them on the estimate / invoice (unless "Solo para mí") */}
      <JobFiles job={job} />

      {/* Original words */}
      {job.description && (
        <section className="mt-6 flex gap-2 text-sm italic text-charcoal/60">
          <Quote className="size-4 shrink-0" />
          <p>
            <span className="not-italic font-semibold text-charcoal/70">{t.whatYouSaid}: </span>
            {job.description}
          </p>
        </section>
      )}

      {/* Prepared but not shared yet: the link is ready, sending it is one tap away */}
      {isUnsent(job) && job.public_token && (
        <div className="mt-6">
          <ShareEstimate job={job} onSent={setJob} />
        </div>
      )}

      </div>
      <div className="pt-8 [grid-area:actions] lg:mt-4 lg:flex lg:flex-wrap lg:items-center lg:gap-2 lg:pt-0 lg:[&>*]:mt-0">
        {missing.length > 0 && (
          <p className="mb-2 text-center text-sm font-semibold text-ojo-ink lg:mb-0 lg:basis-full lg:text-left">{t.completeFirst(missing.map((m) => t.missing[m]))}</p>
        )}
        {/* Main button follows what Carlos picked on Nuevo trabajo; the other document stays one tap away */}
        {isInvoiceJob(job) ? (
          <>
            <button type="button" disabled={missing.length > 0} onClick={() => router.push(`/trabajos/${job.id}/factura`)} className={btnPrimary}>
              <Receipt className="size-5" strokeWidth={2.25} />
              {job.invoice_number ? t.viewInvoice : t.generateInvoice} →
            </button>
            {/* the invoice already exists (made, not sent yet): no switching back to an estimate */}
            {!job.invoice_number && (
              <button
                type="button"
                disabled={missing.length > 0}
                onClick={() => router.push(`/trabajos/${job.id}/estimado`)}
                className={`${btnGhost} disabled:opacity-40`}
              >
                <FileText className="size-4" strokeWidth={2.25} />
                {t.estimateInstead}
              </button>
            )}
          </>
        ) : (
          <>
            <button type="button" disabled={missing.length > 0} onClick={() => router.push(`/trabajos/${job.id}/estimado`)} className={btnPrimary}>
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
          </>
        )}
      </div>
    </WithPreview>
  );
}

/* ───────── After the quote: follow the workflow ───────── */

/** Desktop: the job on the left, what the client will get on the right (updates as he edits). Phone: unchanged. */
function WithPreview({ job, children }: { job: Job; children: React.ReactNode }) {
  const { t } = useLang();
  const [biz, setBiz] = useState<Business>(DEMO_BUSINESS);
  useEffect(() => setBiz({ ...DEMO_BUSINESS, ...loadBusiness() }), []);
  return (
    <Screen className="lg:max-w-[1180px]!">
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8">
        <div className="grid flex-1 grid-rows-[auto_1fr_auto] [grid-template-areas:'head'_'body'_'actions'] lg:grid-rows-[auto_auto_1fr] lg:[grid-template-areas:'head'_'actions'_'body']">
          {children}
        </div>
        <aside className="hidden lg:sticky lg:top-10 lg:block">
          <p className="mb-2 text-sm font-semibold text-muted">{t.whatClientGets}</p>
          <DocumentCard kind={isInvoiceJob(job) ? "invoice" : "estimate"} job={job} biz={biz} view="en" />
        </aside>
      </div>
    </Screen>
  );
}

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
  // Accepted → pick the day, then it's scheduled
  const [day, setDay] = useState(job.scheduled_for ?? "");
  const schedule = async () => {
    if (!day) return;
    await updateJob(job.id, { scheduled_for: day });
    setJob(await setStatus(job.id, "SCHEDULED"));
  };
  const [paying, setPaying] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <WithPreview job={job}>
      {/* three regions: phone = head, job, actions (bottom); desktop = head, actions, job (see WithPreview) */}
      <div className="[grid-area:head]">
        <PageHeader backHref="/trabajos" right={<JobActions job={job} setJob={setJob} />} />
        <Title>{job.customer_name}</Title>
        <p className="mt-1 text-sm text-muted">{serviceLabel(job.service, lang, job.service_es)}</p>
        <SyncNote job={job} />
      </div>
      <div className="flex min-w-0 flex-col [grid-area:body]">

      {job.status === "ACCEPTED" && (
        <section className="mt-5 rounded-[24px] glass-sage p-5 motion-safe:animate-[pop-in_300ms_ease-out]">
          <div className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-forest">
              <PartyPopper className="size-6 text-white" />
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
          <Archive className="size-5 shrink-0 text-charcoal/50" />
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
        {/* client: address + phone (tap to call); the pencil fixes a typo even after sending */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1 text-sm">
            {job.address && <p className="text-muted">{job.address}</p>}
            {job.customer_phone && phoneDigits(job.customer_phone) ? (
              <a href={`tel:+${phoneDigits(job.customer_phone)}`} className="inline-flex items-center gap-1.5 font-semibold text-forest">
                <Phone className="size-3.5" /> {formatPhone(job.customer_phone)}
              </a>
            ) : (
              job.status !== "CANCELLED" && (
                <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 font-semibold text-forest">
                  <Plus className="size-3.5" strokeWidth={2.5} /> {t.addPhone}
                </button>
              )
            )}
          </div>
          {job.status !== "CANCELLED" && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={t.editContact}
              className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-ivory active:bg-white"
            >
              <Pencil className="size-4 text-forest" />
            </button>
          )}
        </div>
        {job.scheduled_for && job.status !== "CANCELLED" && (
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-forest">
            <CalendarDays className="size-4" strokeWidth={2} /> {t.scheduledFor(fmtDay(job.scheduled_for, lang))}
          </p>
        )}
        {linesBySite(job.line_items).map((g) => (
          <div key={g.site ?? "-"} className="mt-3">
            {g.site && (
              <p className="mb-1 flex items-center gap-1 font-mono text-[11px] uppercase tracking-[1px] text-muted">
                <MapPin className="size-3" /> {g.site}
              </p>
            )}
            <ul className="space-y-1.5 text-[15px]">
              {g.lines.map((i) => {
                const amount = lineAmount(i);
                const qty = isLumpSum(job) ? null : quantityLabel(i);
                return (
                  <li key={i.id} className="flex items-start justify-between gap-4">
                    <span className="min-w-0">
                      {lang === "es" ? (i.description_es ?? i.description) : i.description}
                      {qty && <span className="mt-0.5 block text-xs font-normal text-muted">{qty}</span>}
                    </span>
                    {!isLumpSum(job) && <span className="shrink-0 font-bold tabular-nums">{amount === 0 ? t.included : money(amount ?? 0)}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {isLumpSum(job) && (lang === "es" ? job.price_note_es || job.price_note : job.price_note) && (
          <p className="mt-3 text-sm text-muted">{lang === "es" ? job.price_note_es || job.price_note : job.price_note}</p>
        )}
        <hr className="my-4 border-black/10" />
        <div className="flex items-center justify-between">
          <span>{t.total}</span>
          <span className="text-2xl font-bold">{money(jobTotal(job))}</span>
        </div>
        {(job.payments?.length ?? 0) > 0 && <PaymentsSummary job={job} setJob={setJob} />}
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

      {(job.status === "QUOTE_SENT" || job.status === "PAYMENT_PENDING" || isUnsent(job)) && job.public_token && (
        <div className="mt-4">
          {/* estimate out: send it · invoice unpaid: the same box sends the invoice link · prepared: send it now */}
          <ShareEstimate job={job} quiet={isUnsent(job) ? false : job.status === "QUOTE_SENT" ? quoteStale : true} onSent={setJob} />
        </div>
      )}

      {/* Later stages: a quiet record of who approved */}
      {job.approved_by && job.approved_at && job.status !== "CANCELLED" && job.status !== "ACCEPTED" && (
        <p className="mt-4 flex items-center gap-2 rounded-[14px] glass-sage px-4 py-3 text-sm font-semibold text-forest">
          <Check className="size-4 shrink-0" strokeWidth={3} />
          {t.approvedByOn(job.approved_by, fmtDate(job.approved_at, lang))}
        </p>
      )}

      {/* paid: a message, not an action, so it sits with the other records instead of at the bottom */}
      {job.status === "PAID" && (
        <p className="mt-3 flex items-center gap-2 rounded-[14px] glass-sage px-4 py-3 text-sm font-bold text-forest">
          <Check className="size-5 shrink-0" strokeWidth={3} />
          {t.paidDone}
        </p>
      )}

      {/* before/after, receipts, signed change orders: still useful once the job is sent or done */}
      <JobFiles job={job} />

      </div>
      <div className="space-y-3 pt-8 [grid-area:actions] lg:mt-4 lg:flex lg:flex-wrap lg:items-center lg:gap-2 lg:space-y-0 lg:pt-0 lg:[&>*]:mt-0">
        {job.status === "CANCELLED" ? (
          <button type="button" onClick={async () => setJob(await reactivateJob(job.id))} className={btnPrimary}>
            <RotateCcw className="size-5" strokeWidth={2.25} />
            {t.reactivate}
          </button>
        ) : job.status === "PAID" ? null : job.status === "QUOTE_SENT" ? (
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
              <Link href={`/trabajos/${job.id}/seguimiento`} className={btnSage}>
                <MessageCircle className="size-5" strokeWidth={2.25} />
                {job.status === "PAYMENT_PENDING" ? t.sendReminder : t.followUp}
              </Link>
            )}
            {job.status === "COMPLETED" && !job.invoice_number ? (
              <Link href={`/trabajos/${job.id}/factura`} className={btnPrimary}>
                <Receipt className="size-5" strokeWidth={2.25} />
                {t.sendInvoice} →
              </Link>
            ) : job.status === "PAYMENT_PENDING" ? (
              <button type="button" onClick={() => setPaying(true)} className={btnPrimary}>
                {paidSoFar(job) > 0 ? t.addPayment : t.markPaid} →
              </button>
            ) : job.status === "ACCEPTED" ? (
              <div className="space-y-2">
                <label htmlFor="f-schedule-day" className="block text-sm font-semibold">
                  {t.pickDay}
                </label>
                <input
                  id="f-schedule-day"
                  type="date"
                  value={day}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDay(e.target.value)}
                  className="h-[52px] w-full rounded-[14px] glass-field px-4 text-base outline-none ring-forest/60 focus:ring-2"
                />
                <button type="button" onClick={schedule} disabled={!day} className={btnPrimary}>
                  <CalendarDays className="size-5" strokeWidth={2.25} />
                  {day ? t.scheduleOn(fmtDay(day, lang)) : t.nextStep.ACCEPTED} →
                </button>
              </div>
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

      <ContactSheet open={editing} job={job} onClose={() => setEditing(false)} onSaved={(j) => (setEditing(false), setJob(j))} />
      <PaymentSheet open={paying} job={job} onClose={() => setPaying(false)} onSaved={(j) => (setPaying(false), setJob(j))} />
    </WithPreview>
  );
}

/* ───────── Client details: fix name, phone, address after sending ───────── */

function ContactSheet({ open, job, onClose, onSaved }: { open: boolean; job: Job; onClose: () => void; onSaved: (j: Job) => void }) {
  const { t } = useLang();
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  useEffect(() => {
    if (open) setForm({ name: job.customer_name ?? "", phone: formatPhone(job.customer_phone), email: job.customer_email ?? "", address: job.address ?? "" });
  }, [open, job.customer_name, job.customer_phone, job.customer_email, job.address]);

  const save = async () => {
    if (!form.name.trim()) return;
    const name = form.name.trim();
    // Mano misheard the name → remember the right spelling for next time
    if (name !== job.customer_name) rememberNameFix(job.customer_name_heard ?? job.customer_name, name);
    onSaved(
      await updateContact(job.id, {
        customer_name: name,
        customer_phone: form.phone.trim() || null,
        customer_email: form.email.trim() || null,
        address: form.address.trim() || null,
      }),
    );
  };
  const field = "h-[48px] w-full rounded-[14px] glass-field px-4 text-base outline-none ring-forest/60 focus:ring-2";

  return (
    <Sheet open={open} onClose={onClose} title={t.editContact}>
      <p className="mt-1 text-sm text-charcoal/60">{job.public_token ? t.contactNoteSent : t.contactNote}</p>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.clientName}</span>
          <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.customerPhone}</span>
          <input
            className={field}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: nextPhone(form.phone, e.target.value) })}
            type="tel"
            inputMode="tel"
            placeholder="(555) 123-4567"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.clientEmail}</span>
          <input className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" inputMode="email" autoComplete="off" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.address}</span>
          <input className={field} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </label>
      </div>
      <button type="button" onClick={save} disabled={!form.name.trim()} className={`mt-5 ${btnPrimary}`}>
        <Check className="size-5" strokeWidth={2.5} /> {t.saveChanges}
      </button>
    </Sheet>
  );
}

/* ───────── Payments: Zelle, bank, check, cash, card · full or partial ───────── */

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function PaymentsSummary({ job, setJob }: { job: Job; setJob: (j: Job) => void }) {
  const { t, lang } = useLang();
  // typed it wrong: tap ✕, then "Borrar" to confirm
  const [confirming, setConfirming] = useState<string | null>(null);
  const paid = paidSoFar(job);
  const left = balanceDue(job);
  const pct = Math.min(100, Math.round((paid / (jobTotal(job) || 1)) * 100));
  return (
    <div className="mt-3">
      <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 flex justify-between text-sm font-semibold">
        <span className="text-forest">{t.paidAmount(money(paid))}</span>
        {left > 0 && <span>{t.leftToPay(money(left))}</span>}
      </p>
      <ul className="mt-1 space-y-0.5 text-xs text-muted">
        {job.payments!.map((p) => (
          <li key={p.id} className="flex min-h-7 items-center justify-between gap-2">
            <span>
              {shortDate(p.date, lang)} · {t.payMethods[p.method]}
              {p.check_number && ` #${p.check_number}`} · {money(p.amount)}
            </span>
            {job.status !== "CANCELLED" &&
              (confirming === p.id ? (
                <button
                  type="button"
                  onClick={async () => (setConfirming(null), setJob(await removePayment(job.id, p.id)))}
                  className="rounded-full bg-overdue px-2.5 py-1 font-semibold text-overdue-ink"
                >
                  {t.deletePayment}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(p.id)}
                  aria-label={t.deletePayment}
                  className="-mr-1.5 flex size-7 items-center justify-center rounded-full active:bg-black/5"
                >
                  <X className="size-3.5" />
                </button>
              ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

const shortDate = (iso: string, lang: "es" | "en") =>
  new Date(iso).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric" });

function PaymentSheet({ open, job, onClose, onSaved }: { open: boolean; job: Job; onClose: () => void; onSaved: (j: Job) => void }) {
  const { t } = useLang();
  const owed = balanceDue(job);
  const [method, setMethod] = useState<PaymentMethod>("zelle");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [checkNo, setCheckNo] = useState("");
  // each time it opens: the full balance, today
  useEffect(() => {
    if (!open) return;
    setAmount(String(owed));
    setDate(today());
    setCheckNo("");
  }, [open, owed]);

  const value = Math.round(Number(amount) * 100) / 100;
  const valid = value > 0 && value <= owed && !!date;
  const partial = value > 0 && value < owed;
  const save = async () => {
    if (!valid) return;
    // noon local time, so the date never slips a day in another timezone
    const at = new Date(`${date}T12:00:00`).toISOString();
    onSaved(await addPayment(job.id, { amount: value, method, date: at, check_number: method === "check" ? checkNo.trim() || null : null }));
  };
  const field = "h-[48px] w-full rounded-[14px] glass-field px-4 text-base outline-none ring-forest/60 focus:ring-2";

  return (
    <Sheet open={open} onClose={onClose} title={paidSoFar(job) > 0 ? t.addPayment : t.markPaid}>
      {/* amount first, big: most of the time it's already right */}
      <label className="mt-4 flex items-center gap-1 rounded-[16px] glass-field px-4 ring-forest/60 focus-within:ring-2">
        <span className="text-3xl font-bold text-charcoal/40">$</span>
        <input
          aria-label={t.payAmount}
          className="h-[64px] min-w-0 flex-1 bg-transparent text-3xl font-bold outline-none"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
        />
      </label>
      <p className={`mt-1.5 text-sm ${value > owed ? "font-semibold text-overdue-ink" : "text-charcoal/60"}`}>
        {value > owed ? t.tooMuch(money(owed)) : partial ? t.partialNote(money(owed - value)) : t.stillOwed(money(owed))}
      </p>

      <div role="radiogroup" aria-label={t.payMethod} className="mt-4 grid grid-cols-5 gap-1">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={method === m}
            onClick={() => setMethod(m)}
            className={`h-10 rounded-[12px] px-0.5 text-[13px] font-semibold tracking-[-0.2px] transition ${method === m ? "bg-forest text-white" : "bg-white text-charcoal"}`}
          >
            {t.payMethods[m]}
          </button>
        ))}
      </div>

      <div className={`mt-3 grid gap-2 ${method === "check" ? "grid-cols-2" : "grid-cols-1"}`}>
        <input aria-label={t.payDate} className={field} type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        {method === "check" && (
          <input aria-label={t.checkNumber} placeholder={t.checkShort} className={field} value={checkNo} onChange={(e) => setCheckNo(e.target.value)} inputMode="numeric" />
        )}
      </div>

      <button type="button" onClick={save} disabled={!valid} className={`mt-5 ${btnPrimary}`}>
        <Check className="size-5" strokeWidth={2.5} /> {partial ? t.savePartial : t.savePaid}
      </button>
    </Sheet>
  );
}

function DocLink({ href, label, number, state }: { href: string; label: string; number?: string | null | 0; state?: InvoiceState | null }) {
  const { t } = useLang();
  return (
    <Link href={href} className="flex items-center gap-2 rounded-[12px] bg-ivory px-3 py-2.5 text-sm font-semibold text-forest">
      <FileText className="size-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {number && <span className="font-mono text-xs text-charcoal/70">{number}</span>}
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
      <StatusBadge status={job.status} invoice={isInvoiceJob(job)} />
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
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-semibold text-overdue-ink active:bg-black/5"
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
        <p className="mt-2 text-base leading-6 text-charcoal/70">{t.deleteBody}</p>
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
        <p className="mt-2 text-sm leading-5 text-charcoal/70">{t.cancelBody}</p>
        <div role="radiogroup" className="mt-5 space-y-2">
          {CANCEL_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className={`flex h-[56px] w-full items-center justify-between rounded-[16px] px-4 text-left text-base font-semibold transition ${
                reason === r ? "bg-forest text-white" : "bg-white text-charcoal"
              }`}
            >
              {t.reasons[r]}
              {reason === r && (
                <span className="flex size-6 items-center justify-center rounded-full bg-sage">
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

// Número de factura + Vence, before the invoice is made. Saved on the job and used when it's made.
function InvoiceDetails({ job, setJob }: { job: Job; setJob: (j: Job) => void }) {
  const { t } = useLang();
  const current = job.invoice_number ?? job.invoice_number_planned ?? null;
  const [num, setNum] = useState(() => String(current ?? peekInvoiceNumber()));
  const [due, setDue] = useState(() => dueDay(job.invoice_due_at ?? defaultDue()));
  const [error, setError] = useState<string | null>(null);
  const box = "flex h-[48px] w-full items-center rounded-[14px] glass-field px-4 text-base ring-forest/60 focus-within:ring-2";

  const commit = async () => {
    const n = Number(num);
    if (!num || !Number.isInteger(n) || n < 1) {
      setNum(String(current ?? peekInvoiceNumber()));
      return setError(null);
    }
    if (n === current) return setError(null);
    if (invoiceNumberTaken(n, job.id)) return setError(t.invoiceNumberTaken(invoiceNo(n)));
    setError(null);
    setJob(await setInvoiceNumber(job.id, n));
  };

  return (
    <section className="mt-6">
      <div className="grid grid-cols-2 gap-3">
        <label className="block min-w-0">
          <FieldLabel text={t.invoiceNumberLabel} missingTag={null} />
          <span className={`${box} font-mono`}>
            <span className="text-muted">INV-</span>
            <input
              value={num}
              onChange={(e) => (setNum(e.target.value.replace(/\D/g, "").slice(0, 6)), setError(null))}
              onBlur={() => void commit()}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              inputMode="numeric"
              aria-invalid={!!error}
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </span>
        </label>
        <label className="block min-w-0">
          <FieldLabel text={t.dueLabel} missingTag={null} />
          <span className={box}>
            <input
              type="date"
              value={due}
              min={dueDay(new Date().toISOString())}
              onChange={async (e) => {
                const v = e.target.value;
                if (!v) return;
                setDue(v);
                setJob(await setInvoiceDue(job.id, v));
              }}
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </span>
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-overdue-ink">
          {error}
        </p>
      )}
    </section>
  );
}

function FieldLabel({ text, missingTag, hint }: { text: string; missingTag: string | null; hint?: string }) {
  return (
    <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
      <span>
        {text}
        {hint && <span className="font-normal text-muted"> · {hint}</span>}
      </span>
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
      <div className={`mb-1.5 rounded-[12px] px-3 py-2 text-xs ${needsEnglish ? "bg-flag/15 text-ojo-ink" : "bg-ivory text-charcoal/70"}`}>
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
      className="flex cursor-text items-start gap-1.5 px-2.5 pb-1.5 pt-1 text-xs leading-4 text-charcoal/45"
    >
      <span className="shrink-0 font-mono text-[10px] uppercase leading-4 tracking-wide">EN</span>
      <span lang="en">{item.description}</span>
    </p>
  );
}

/** Quiet line under the title: is this job saved in the backend's database? (only jobs made with Nuevo trabajo) */
function SyncNote({ job }: { job: Job }) {
  const { t } = useLang();
  if (!job.backend_sync) return null;
  const text = job.backend_sync === "ok" ? t.syncedDb : job.backend_sync === "error" ? t.syncFailedDb : t.syncingDb;
  return (
    <p role="status" className={`mt-1 flex items-center gap-1 text-xs ${job.backend_sync === "ok" ? "text-forest/70" : "text-muted"}`}>
      <Database className="size-3" strokeWidth={2} aria-hidden /> {text}
    </p>
  );
}

/** "2026-10-14" → "mar 14 oct" / "Tue, Oct 14" (a calendar day: no time zone shift) */
function fmtDay(day: string, lang: "es" | "en") {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { weekday: "short", month: "short", day: "numeric" });
}
