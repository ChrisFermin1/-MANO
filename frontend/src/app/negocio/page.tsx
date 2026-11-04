"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Eye, LogOut, Sparkles, Trash2 } from "lucide-react";
import { LangToggle } from "@/components/lang-toggle";
import { PageHeader, Screen, Sheet, Title, btnDanger, btnSecondary, input } from "@/components/ui";
import { highestInvoiceNumber, invoiceNo, peekInvoiceNumber } from "@/lib/api";
import { deleteAccount, getSession, signOut, type Session } from "@/lib/auth";
import { getPlan, onPlanChange, type PlanInfo } from "@/lib/plan";
import { DEMO_BUSINESS, DUE_OPTIONS, loadBusiness, saveBusiness, type Business } from "@/lib/business";
import { checklistItemByKey } from "@/lib/checklists";
import { useLang, type TradeId } from "@/lib/i18n";
import { TRADES } from "@/lib/trades";
import { formatPhone, isFullPhone, nextPhone } from "@/lib/phone";

// "Tu negocio": everything onboarding asked, editable later (the "C" on the dashboard opens it)
export default function Negocio() {
  const { t, lang } = useLang();
  const [biz, setBiz] = useState<Business | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false); // nothing to save until something changes
  const [nextInv, setNextInv] = useState(""); // "190": where invoice numbers continue (from Wave, etc.)
  const [used, setUsed] = useState(0); // highest invoice number already in Mano

  const saveRef = useRef<() => void>(() => {});
  const okRef = useRef(false);

  useEffect(() => {
    setBiz({ ...DEMO_BUSINESS, ...loadBusiness() });
    setNextInv(String(peekInvoiceNumber()));
    setUsed(highestInvoiceNumber());
  }, []);

  // Saves by itself half a second after he stops typing — only when everything required is filled in
  useEffect(() => {
    if (!dirty || !okRef.current) return;
    const id = setTimeout(() => saveRef.current(), 600);
    return () => clearTimeout(id);
  }, [biz, nextInv, dirty]);
  // "Guardado ✓" shows for a moment, then goes away
  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(id);
  }, [saved]);

  if (!biz) return <Screen className="lg:max-w-[1000px]!">{null}</Screen>;

  const change = (patch: Partial<Business>) => {
    setBiz({ ...biz, ...patch });
    setSaved(false);
    setDirty(true);
  };
  // Same rule as Paso 1: "Otro" is exclusive
  const toggle = (id: TradeId) => {
    const s = biz.trades;
    const trades: TradeId[] = s.includes(id) ? s.filter((x) => x !== id) : id === "other" ? ["other"] : [...s.filter((x) => x !== "other"), id];
    change({ trades });
  };
  const otherOn = biz.trades.includes("other");
  const silenced = (biz.ojoIgnore ?? []).map((key) => ({
    key,
    label: checklistItemByKey(key)?.label[lang] ?? biz.ojoIgnoreLabels?.[key]?.[lang] ?? key,
  }));
  const nextInvTooLow = nextInv !== "" && Number(nextInv) <= used; // can't reuse a number Mano already gave out
  const canSave =
    Number(nextInv) >= 1 &&
    !nextInvTooLow &&
    biz.ownerName.trim() !== "" &&
    biz.businessName.trim() !== "" &&
    isFullPhone(biz.phone) && // it's on every estimate and invoice: a number the client can call
    biz.trades.length > 0 &&
    (!otherOn || !!biz.otherTrade?.name.trim());

  const save = () => {
    saveBusiness({
      ownerName: biz.ownerName.trim(),
      email: biz.email?.trim() ?? "",
      address: biz.address?.trim() ?? "",
      businessName: biz.businessName.trim(),
      phone: biz.phone.trim(),
      payInfo: biz.payInfo?.trim() ?? "",
      invoiceDueDays: biz.invoiceDueDays ?? 15,
      nextInvoiceNumber: Number(nextInv),
      salesTaxRate: biz.salesTaxRate && biz.salesTaxRate > 0 && biz.salesTaxRate < 30 ? biz.salesTaxRate : null,
      trades: biz.trades,
      otherTrade: otherOn ? { name: biz.otherTrade?.name.trim() ?? "", unit: biz.otherTrade?.unit ?? "project" } : null,
      ojoIgnore: biz.ojoIgnore ?? [],
      ojoQuestions: !!biz.ojoQuestions,
    });
    setSaved(true);
    setDirty(false);
  };
  saveRef.current = save;
  okRef.current = canSave;

  return (
    <Screen className="lg:max-w-[1000px]!">
      <PageHeader backHref="/inicio" right={<LangToggle light />} />
      <Title>{t.bizTitle}</Title>
      <p className="mt-2 text-base leading-5">{t.settingsBody}</p>

      {/* desktop: a small menu on the left that jumps to each part; phone: one page, top to bottom */}
      <div className="lg:mt-8 lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-12">
      <nav aria-label={t.bizTitle} className="hidden lg:block">
        <ul className="sticky top-8 space-y-1">
          {[
            ["trabajo", t.yourWork],
            ["datos", t.yourDetails],
            ["ojo", "Ojo"],
            ["plan", t.currentPlan],
            ["cuenta", t.account],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="block rounded-[10px] px-3 py-2 text-sm font-semibold text-charcoal/70 transition hover:bg-black/5 hover:text-charcoal">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-col">

      <section id="trabajo" className="mt-8 scroll-mt-8 lg:mt-0">
        <h2 className="text-sm font-semibold">{t.yourWork}</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {TRADES.map(({ id, icon: Icon }) => {
            const on = biz.trades.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                aria-pressed={on}
                className={`relative flex h-[76px] flex-col justify-between rounded-[16px] p-3 text-left transition active:scale-[0.98] ${
                  on ? "glass-forest text-white" : "glass text-charcoal"
                }`}
              >
                <Icon className={`size-6 ${on ? "text-white" : ""}`} strokeWidth={1.75} />
                {on && (
                  <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-sage">
                    <Check className="size-3 text-forest" strokeWidth={3} />
                  </span>
                )}
                <span className="text-sm font-semibold leading-4">{t.trades[id]}</span>
              </button>
            );
          })}
        </div>
        {otherOn && (
          <label className="mt-3 block">
            <span className="mb-1.5 block text-sm font-semibold">{t.otherPrompt}</span>
            <input
              id="f-other-trade"
              className={input}
              value={biz.otherTrade?.name ?? ""}
              onChange={(e) => change({ otherTrade: { name: e.target.value, unit: biz.otherTrade?.unit ?? "project" } })}
              placeholder={t.otherPlaceholder}
            />
          </label>
        )}
      </section>

      <section id="datos" className="mt-8 scroll-mt-8 space-y-3">
        <h2 className="text-sm font-semibold">{t.yourDetails}</h2>
        <label className="block">
          <span className="mb-1.5 block text-sm text-charcoal/70">{t.fullName}</span>
          <input id="f-owner" className={input} value={biz.ownerName} onChange={(e) => change({ ownerName: e.target.value })} autoComplete="name" placeholder="Carlos Méndez" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-charcoal/70">{t.bizName}</span>
          <input id="f-biz" className={input} value={biz.businessName} onChange={(e) => change({ businessName: e.target.value })} autoComplete="organization" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-charcoal/70">{t.phone}</span>
          <input
            id="f-phone"
            className={input}
            value={biz.phone}
            onChange={(e) => change({ phone: nextPhone(biz.phone, e.target.value) })}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(555) 123-4567"
          />
          {biz.phone.trim() && !isFullPhone(biz.phone) && <span className="mt-1.5 block text-xs font-semibold text-ojo-ink">{t.phoneNeedsArea}</span>}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-charcoal/70">
            {t.bizEmail} <span className="text-muted">· {t.optional}</span>
          </span>
          <input
            id="f-email"
            className={input}
            value={biz.email ?? ""}
            onChange={(e) => change({ email: e.target.value })}
            type="email"
            inputMode="email"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-charcoal/70">
            {t.bizAddress} <span className="text-muted">· {t.optional}</span>
          </span>
          <input id="f-address" className={input} value={biz.address ?? ""} onChange={(e) => change({ address: e.target.value })} autoComplete="street-address" />
          <span className="mt-1.5 block text-xs text-muted">{t.bizAddressHint}</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-charcoal/70">
            {t.payInfo} <span className="text-muted">· {t.optional}</span>
          </span>
          <textarea
            id="f-payinfo"
            rows={3}
            className={`${input} h-auto resize-none py-3 leading-6`}
            value={biz.payInfo ?? ""}
            onChange={(e) => change({ payInfo: e.target.value })}
            placeholder={t.payInfoPlaceholder}
          />
          <span className="mt-1.5 block text-xs text-muted">{t.payInfoHint}</span>
        </label>
        <div>
          <span className="mb-1.5 block text-sm text-charcoal/70">{t.dueTerms}</span>
          <div role="radiogroup" aria-label={t.dueTerms} className="grid grid-cols-3 gap-1.5">
            {DUE_OPTIONS.map((d) => {
              const on = (biz.invoiceDueDays ?? 15) === d;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => change({ invoiceDueDays: d })}
                  className={`h-10 rounded-[12px] text-[13px] font-semibold transition ${on ? "bg-forest text-white" : "bg-white text-charcoal"}`}
                >
                  {d === 0 ? t.dueOnReceipt : t.dueDays(d)}
                </button>
              );
            })}
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm text-charcoal/70">{t.nextInvoiceLabel}</span>
          <span className={`${input} flex items-center font-mono`}>
            <span className="text-muted">INV-</span>
            <input
              value={nextInv}
              onChange={(e) => {
                setNextInv(e.target.value.replace(/\D/g, "").slice(0, 6));
                setSaved(false);
                setDirty(true);
              }}
              inputMode="numeric"
              aria-label={t.nextInvoiceLabel}
              aria-invalid={nextInvTooLow}
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </span>
          {nextInvTooLow ? (
            <span role="alert" className="mt-1.5 block text-xs font-semibold text-overdue-ink">
              {t.nextInvoiceTooLow(invoiceNo(used))}
            </span>
          ) : (
            <span className="mt-1.5 block text-xs text-muted">{t.nextInvoiceHelp}</span>
          )}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-charcoal/70">
            {t.salesTax} <span className="text-muted">· {t.optional}</span>
          </span>
          <span className={`${input} flex items-center`}>
            <input
              value={biz.salesTaxRate ?? ""}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, "").slice(0, 6);
                change({ salesTaxRate: v === "" ? null : Number(v) });
              }}
              inputMode="decimal"
              placeholder="8.9"
              aria-label={t.salesTax}
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
            <span className="text-muted">%</span>
          </span>
          <span className="mt-1.5 block text-xs text-muted">{t.salesTaxHint}</span>
        </label>
      </section>

      <section id="ojo" className="mt-8 scroll-mt-8">
        {/* Ojo's "forgot to charge?" questions: off by default, one switch */}
        <button
          type="button"
          role="switch"
          aria-checked={!!biz.ojoQuestions}
          onClick={() => change({ ojoQuestions: !biz.ojoQuestions })}
          className="flex w-full items-center gap-3 rounded-[16px] glass px-4 py-3 text-left"
        >
          <Eye className="size-5 shrink-0 text-ojo" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{t.ojoQuestionsToggle}</span>
            <span className="block text-xs text-muted">{t.ojoQuestionsHint}</span>
          </span>
          <span className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition ${biz.ojoQuestions ? "bg-forest" : "bg-black/15"}`}>
            <span className={`size-6 rounded-full bg-white shadow transition ${biz.ojoQuestions ? "translate-x-5" : ""}`} />
          </span>
        </button>
      </section>

      {biz.ojoQuestions && (
      <section className="mt-6">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Eye className="size-4 text-ojo" strokeWidth={1.75} /> {t.ojoSilenced}
        </h2>
        {silenced.length === 0 ? (
          <p className="mt-2 text-sm leading-5 text-muted">{t.ojoSilencedNone}</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/5 rounded-[16px] glass">
            {silenced.map(({ key, label }) => (
              <li key={key} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0">{label}</span>
                <button
                  type="button"
                  onClick={() => change({ ojoIgnore: (biz.ojoIgnore ?? []).filter((k) => k !== key) })}
                  className="shrink-0 font-semibold text-forest"
                >
                  {t.askAgain}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {/* autosave status: a moment of "Guardado", or what's blocking it */}
      {(saved || (dirty && !canSave)) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] z-40 flex justify-center px-4 lg:left-[240px]">
          <p
            role="status"
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-[0_6px_20px_-8px_rgba(32,37,34,0.35)] ${
              saved ? "bg-forest text-white" : "bg-peach text-ojo-ink"
            }`}
          >
            {saved ? (
              <>
                <Check className="size-4" strokeWidth={3} /> {t.savedChanges}
              </>
            ) : (
              t.fixToSave
            )}
          </p>
        </div>
      )}

      <YourPlan />
      <Account />
      </div>
      </div>
    </Screen>
  );
}

// Which plan he's on, and the way to the Planes page
function YourPlan() {
  const { t } = useLang();
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  useEffect(() => {
    setPlan(getPlan());
    return onPlanChange(() => setPlan(getPlan()));
  }, []);
  if (!plan) return null;
  return (
    <section id="plan" className="mt-10 scroll-mt-8 border-t border-black/10 pt-6">
      <h2 className="text-sm font-semibold">{t.currentPlan}</h2>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-base font-semibold">{t.yourPlanLine(t.planName[plan.id])}</p>
        <Link href="/planes" className="flex items-center gap-1 text-sm font-bold text-pro hover:underline">
          <Sparkles className="size-4" strokeWidth={2.25} /> {t.seePlans}
        </Link>
      </div>
    </section>
  );
}

// Who's signed in, sign out, and delete the account (stores ask for this; it's also just fair)
function Account() {
  const { t } = useLang();
  const [session, setSession] = useState<Session | null>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setSession(getSession()), []);
  if (!session) return null;

  const via =
    session.method === "phone"
      ? formatPhone(session.phone)
      : session.method === "email"
        ? session.email
        : session.method === "demo"
          ? t.seeDemo
          : `${session.method === "google" ? "Google" : "Apple"}${session.email ? ` · ${session.email}` : ""}`;

  return (
    <section id="cuenta" className="mt-8 scroll-mt-8 border-t border-black/10 pt-6">
      <h2 className="text-sm font-semibold">{t.account}</h2>
      <p className="mt-1 text-sm leading-5 text-charcoal/70">
        {t.signedInWith} <span className="font-semibold text-charcoal">{via}</span>
      </p>
      <div className="mt-4 flex flex-col gap-3 desk:flex-row desk:items-center">
        <button type="button" onClick={signOut} className={btnSecondary}>
          <LogOut className="size-5" strokeWidth={2} /> {t.signOut}
        </button>
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="flex h-11 items-center justify-center gap-2 text-sm font-semibold text-overdue-ink lg:ml-auto"
        >
          <Trash2 className="size-4" strokeWidth={2} /> {t.deleteAccount}
        </button>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title={t.deleteAccountTitle}>
        <p className="text-base leading-6 text-charcoal/80">{t.deleteAccountBody}</p>
        <div className="mt-6 space-y-3">
          <button type="button" onClick={deleteAccount} className={btnDanger}>
            {t.deleteAccountConfirm}
          </button>
          <button type="button" onClick={() => setConfirm(false)} className={btnSecondary}>
            {t.deleteAccountNo}
          </button>
        </div>
      </Sheet>
    </section>
  );
}
