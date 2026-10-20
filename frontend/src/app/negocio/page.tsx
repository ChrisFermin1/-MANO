"use client";

import { useEffect, useState } from "react";
import { Check, Eye } from "lucide-react";
import { LangToggle } from "@/components/lang-toggle";
import { PageHeader, Screen, Title, btnPrimary, input } from "@/components/ui";
import { DEMO_BUSINESS, DUE_OPTIONS, loadBusiness, saveBusiness, type Business } from "@/lib/business";
import { checklistItemByKey } from "@/lib/checklists";
import { useLang, type TradeId } from "@/lib/i18n";
import { TRADES } from "@/lib/trades";
import { isFullPhone, nextPhone } from "@/lib/phone";

// "Tu negocio": everything onboarding asked, editable later (the "C" on the dashboard opens it)
export default function Negocio() {
  const { t, lang } = useLang();
  const [biz, setBiz] = useState<Business | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false); // nothing to save until something changes

  useEffect(() => setBiz({ ...DEMO_BUSINESS, ...loadBusiness() }), []);
  if (!biz) return <Screen>{null}</Screen>;

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
  const canSave =
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
      trades: biz.trades,
      otherTrade: otherOn ? { name: biz.otherTrade?.name.trim() ?? "", unit: biz.otherTrade?.unit ?? "project" } : null,
      ojoIgnore: biz.ojoIgnore ?? [],
      ojoQuestions: !!biz.ojoQuestions,
    });
    setSaved(true);
    setDirty(false);
  };

  return (
    <Screen>
      <PageHeader backHref="/inicio" right={<LangToggle light />} />
      <Title>{t.bizTitle}</Title>
      <p className="mt-2 text-base leading-5">{t.settingsBody}</p>

      <section className="mt-8">
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

      <section className="mt-8 space-y-3">
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
          <div role="radiogroup" aria-label={t.dueTerms} className="grid grid-cols-4 gap-1.5">
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
      </section>

      <section className="mt-8">
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

      <div className="mt-auto pt-8">
        <button type="button" onClick={save} disabled={!canSave || !dirty} className={btnPrimary}>
          {saved ? (
            <>
              <Check className="size-5" strokeWidth={2.5} /> {t.savedChanges}
            </>
          ) : (
            t.saveChanges
          )}
        </button>
      </div>
    </Screen>
  );
}
