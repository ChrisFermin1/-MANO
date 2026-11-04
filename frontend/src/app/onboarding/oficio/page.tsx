"use client";

import { btnPrimary } from "@/components/ui";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye } from "lucide-react";
import { OnboardingHeader } from "@/components/onboarding-header";
import { OnboardingAside } from "@/components/onboarding-aside";
import { loadBusiness, saveBusiness } from "@/lib/business";
import { useLang, type TradeId } from "@/lib/i18n";
import { TRADES } from "@/lib/trades";

export default function TuOficio() {
  const { t } = useLang();
  const router = useRouter();
  const [selected, setSelected] = useState<TradeId[]>([]);
  const [otherName, setOtherName] = useState("");
  const otherOn = selected.includes("other");

  // "Otro" is exclusive: picking it clears the rest, picking any trade clears "Otro"
  const toggle = (id: TradeId) =>
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (id === "other") return ["other"];
      return [...s.filter((x) => x !== "other"), id];
    });

  const next = () => {
    saveBusiness({
      trades: selected,
      otherTrade: otherOn ? { name: otherName.trim(), unit: loadBusiness()?.otherTrade?.unit ?? "project" } : null,
    });
    router.push("/onboarding/paso-2");
  };

  return (
    <main className="bg-mano-light text-charcoal lg:pl-[40%]">
      <OnboardingAside step={1} />
      <div className="mx-auto max-w-[430px] px-[25px] pb-[calc(116px+max(20px,env(safe-area-inset-bottom)))] pt-[calc(16px+env(safe-area-inset-top))] lg:max-w-[600px] lg:px-12 lg:pt-14 lg:pb-0">
        <OnboardingHeader step={1} total={3} backHref="/" />

        <h1 className="mt-6 font-serif text-[36px] leading-10 tracking-[-0.72px]">{t.tradeTitle}</h1>
        <p className="mt-2 text-base leading-5">{t.tradeBody}</p>

        <div className="mt-5 grid grid-cols-2 gap-x-[9px] gap-y-[13px] lg:grid-cols-3 lg:gap-3">
          {TRADES.map(({ id, icon: Icon }) => {
            const on = selected.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                aria-pressed={on}
                className={`relative flex h-[96px] flex-col justify-between rounded-[20px] p-[14px] text-left transition active:scale-[0.98] ${
                  on ? "glass-forest text-white" : "glass text-charcoal"
                }`}
              >
                <Icon className={`size-[34px] ${on ? "text-white" : ""}`} strokeWidth={1.75} />
                {on && (
                  <span className="absolute right-[14px] top-[18px] flex size-[25px] items-center justify-center rounded-full bg-sage">
                    <Check className="size-[15px] text-forest" strokeWidth={3} />
                  </span>
                )}
                <span className="text-base font-semibold leading-5">{t.trades[id]}</span>
              </button>
            );
          })}
        </div>

        {otherOn && (
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold">{t.otherPrompt}</span>
            <input
              autoFocus
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
              placeholder={t.otherPlaceholder}
              className="h-[56px] w-full rounded-[20px] glass-field px-5 text-base outline-none ring-2 ring-forest placeholder:text-muted"
            />
          </label>
        )}

        {/* Meet Ojo: missing info and what's next (its "forgot to charge?" questions are off by default) */}
        <div className="mt-5 flex gap-[7px] rounded-[14px] glass-peach py-3 pl-[23px] pr-[14px] text-xs leading-[15px]">
          <Eye className="-mt-[3px] size-6 shrink-0 text-[#b8803f]" strokeWidth={1.75} />
          <p>
            <span className="font-bold">{t.meetOjo}</span> {t.meetOjoBody}
          </p>
        </div>

        {/* pinned to the bottom of the screen (fixed, not height-based): "Siguiente" is always on screen, the trades scroll behind it */}
        </div>
      {/* desktop: right after the form, not pinned to the bottom of the screen */}
      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-ivory from-75% to-ivory/0 pt-8 lg:static lg:bg-none lg:pt-8">
        <div className="mx-auto max-w-[430px] px-[25px] pb-[max(20px,env(safe-area-inset-bottom))] lg:max-w-[600px] lg:px-12 lg:pb-10">
          <button
            type="button"
            onClick={next}
            disabled={selected.length === 0}
            className={btnPrimary}
          >
            {t.next} →
          </button>
          <p className="mt-3 text-center text-sm font-medium leading-4 text-muted">{t.changeLater}</p>
        </div>
      </div>
    </main>
  );
}
