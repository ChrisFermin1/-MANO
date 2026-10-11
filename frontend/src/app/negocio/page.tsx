"use client";

import { useEffect, useState } from "react";
import { Check, Eye } from "lucide-react";
import { LangToggle } from "@/components/lang-toggle";
import { PageHeader, Screen, Title, btnPrimary, input } from "@/components/ui";
import { DEMO_BUSINESS, loadBusiness, saveBusiness, type Business } from "@/lib/business";
import { checklistItemByKey } from "@/lib/checklists";
import { useLang, type TradeId } from "@/lib/i18n";
import { TRADES } from "@/lib/trades";

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
    biz.ownerName.trim() !== "" && biz.businessName.trim() !== "" && biz.trades.length > 0 && (!otherOn || !!biz.otherTrade?.name.trim());

  const save = () => {
    saveBusiness({
      ownerName: biz.ownerName.trim(),
      businessName: biz.businessName.trim(),
      phone: biz.phone.trim(),
      trades: biz.trades,
      otherTrade: otherOn ? { name: biz.otherTrade?.name.trim() ?? "", unit: biz.otherTrade?.unit ?? "project" } : null,
      ojoIgnore: biz.ojoIgnore ?? [],
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
                  on ? "glass-forest text-white" : "glass text-black"
                }`}
              >
                <Icon className={`size-6 ${on ? "text-lime" : ""}`} strokeWidth={1.75} />
                {on && (
                  <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-lime">
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
          <span className="mb-1.5 block text-sm text-black/70">{t.yourName}</span>
          <input id="f-owner" className={input} value={biz.ownerName} onChange={(e) => change({ ownerName: e.target.value })} autoComplete="given-name" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-black/70">{t.bizName}</span>
          <input id="f-biz" className={input} value={biz.businessName} onChange={(e) => change({ businessName: e.target.value })} autoComplete="organization" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-black/70">
            {t.phone} <span className="text-muted">· {t.optional}</span>
          </span>
          <input
            id="f-phone"
            className={input}
            value={biz.phone}
            onChange={(e) => change({ phone: e.target.value })}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(555) 123-4567"
          />
        </label>
      </section>

      <section className="mt-8">
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
