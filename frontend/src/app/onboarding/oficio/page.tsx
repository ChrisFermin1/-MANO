"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye } from "lucide-react";
import { OnboardingHeader } from "@/components/onboarding-header";
import { loadBusiness, saveBusiness } from "@/lib/business";
import { checklistFor } from "@/lib/checklists";
import { useLang, type TradeId } from "@/lib/i18n";
import { TRADES } from "@/lib/trades";

export default function TuOficio() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [selected, setSelected] = useState<TradeId[]>([]);
  const [otherName, setOtherName] = useState("");
  const otherOn = selected.includes("other");
  const checks = checklistFor(selected);
  // 3 varied examples: the first item of each picked trade, then fill from the rest
  const examples = [
    ...new Set([
      ...selected.flatMap((id) => checklistFor([id]).slice(0, 1)),
      ...checks,
    ].map((c) => c.label[lang])),
  ].slice(0, 3);

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
    <main className="min-h-dvh bg-cream text-black">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-[25px] pb-8 pt-[33px]">
        <OnboardingHeader step={1} total={2} backHref="/" />

        <h1 className="mt-[50px] font-serif text-[36px] leading-10 tracking-[-0.72px]">{t.tradeTitle}</h1>
        <p className="mt-2 text-base leading-5">{t.tradeBody}</p>

        <div className="mt-[37px] grid grid-cols-2 gap-x-[9px] gap-y-[13px]">
          {TRADES.map(({ id, icon: Icon }) => {
            const on = selected.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                aria-pressed={on}
                className={`relative flex h-[124px] flex-col justify-between rounded-[20px] p-[14px] text-left transition active:scale-[0.98] ${
                  on ? "bg-forest text-white" : "bg-white text-black"
                }`}
              >
                <Icon className={`size-[34px] ${on ? "text-lime" : ""}`} strokeWidth={1.75} />
                {on && (
                  <span className="absolute right-[14px] top-[18px] flex size-[25px] items-center justify-center rounded-full bg-lime">
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
              className="h-[56px] w-full rounded-[20px] bg-white px-5 text-base outline-none ring-2 ring-forest placeholder:text-muted"
            />
          </label>
        )}

        {/* Paso 1's real job: picks which "forgot to charge" checklists Ojo watches */}
        <div className="mt-5 flex gap-[7px] rounded-[10px] bg-peach py-3 pl-[23px] pr-[14px] text-xs leading-[15px]">
          <Eye className="-mt-[3px] size-6 shrink-0 text-[#b8803f]" strokeWidth={1.75} />
          {selected.length === 0 ? (
            <p>
              <span className="font-bold">{t.meetOjo}</span> {t.meetOjoBody}
            </p>
          ) : (
            <div aria-live="polite">
              <p>
                <span className="font-bold">{t.meetOjo}</span> {t.meetOjoShort}
              </p>
              {/* Always one sentence, no matter how many trades are picked */}
              <p className="mt-1.5 font-semibold">
                {checks.length > 0 ? t.ojoChecksSummary(checks.length, examples) : t.ojoLearnsOther}
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto pt-[52px]">
          <button
            type="button"
            onClick={next}
            disabled={selected.length === 0}
            className="flex h-[53px] w-full items-center justify-center rounded-[20px] bg-forest text-sm font-bold text-lime transition active:scale-[0.98] disabled:opacity-40"
          >
            {t.next} →
          </button>
          <p className="mt-4 text-center text-sm font-medium leading-4 text-muted">{t.changeLater}</p>
        </div>
      </div>
    </main>
  );
}
