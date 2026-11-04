"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, Sparkles } from "lucide-react";
import { PageHeader, Screen, Sheet, Title, btnPrimary } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { PLANS, choosePlan, getPlan, onPlanChange, type PlanId } from "@/lib/plan";

const ORDER: PlanId[] = ["free", "solo", "crew"];

export default function PlanesPage() {
  return (
    <Suspense>
      <Planes />
    </Suspense>
  );
}

// Free / Solo / Crew. Reached from Tu negocio or from an upgrade card (?from=files highlights Solo).
function Planes() {
  const { t } = useLang();
  const from = useSearchParams()?.get("from");
  const [current, setCurrent] = useState<PlanId | null>(null);
  const [picking, setPicking] = useState<PlanId | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<PlanId | null>(null);

  useEffect(() => {
    setCurrent(getPlan().id);
    return onPlanChange(() => setCurrent(getPlan().id));
  }, []);
  if (!current) return <Screen>{null}</Screen>;

  const confirm = async () => {
    if (!picking) return;
    setBusy(true);
    await choosePlan(picking);
    setBusy(false);
    setDone(picking);
    setPicking(null);
    window.scrollTo({ top: 0, behavior: "smooth" }); // the "Listo" message is at the top
  };

  return (
    <Screen>
      <PageHeader backHref="/negocio" />
      <Title>{t.plansTitle}</Title>
      <p className="mt-2 text-base leading-6 text-charcoal/70">{t.plansBody}</p>

      {done && (
        <p role="status" className="mt-6 flex items-center gap-2 rounded-[14px] bg-pro-tint px-4 py-3 text-sm font-bold text-pro-ink motion-safe:animate-[pop-in_300ms_ease-out]">
          <Sparkles className="size-5 shrink-0" strokeWidth={2} /> {t.planActive(t.planName[done])}
        </p>
      )}

      <ul className="mt-6 grid gap-4 md:grid-cols-3 md:gap-6">
        {ORDER.map((id) => {
          const p = PLANS[id];
          const mine = id === current;
          const spotlight = !mine && id === "solo" && (from === "files" || current === "free");
          return (
            <li
              key={id}
              className={`flex flex-col rounded-[20px] p-6 ${spotlight ? "bg-pro text-white" : "border border-black/[0.06] bg-white"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-serif text-[28px] leading-8 tracking-[-0.5px]">{t.planName[id]}</p>
                {mine && <span className="rounded-full bg-pro-tint px-2.5 py-1 text-xs font-bold text-pro-ink">{t.currentPlan}</span>}
              </div>
              <p className={`mt-1 text-sm ${spotlight ? "text-white/70" : "text-muted"}`}>{t.planWho[id]}</p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-[32px] font-bold leading-none tabular-nums">${p.price}</span>
                <span className={`text-sm ${spotlight ? "text-white/70" : "text-muted"}`}>{t.perMonth}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2 text-sm leading-5">
                {t.planFeatures[id].map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className={`mt-0.5 size-4 shrink-0 ${spotlight ? "text-pro-light" : "text-pro"}`} strokeWidth={2.75} />
                    {f}
                  </li>
                ))}
              </ul>
              {!mine && (
                <button
                  type="button"
                  onClick={() => setPicking(id)}
                  className={`mt-6 flex h-12 items-center justify-center rounded-[14px] text-sm font-bold transition active:scale-[0.98] ${
                    spotlight ? "bg-white text-pro" : "border border-pro/25 text-pro hover:bg-pro-tint"
                  }`}
                >
                  {t.switchTo(t.planName[id])}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <Sheet open={!!picking} onClose={() => !busy && setPicking(null)} title={picking ? t.checkoutTitle(t.planName[picking]) : ""}>
        {picking && (
          <div className="mt-3">
            <p className="text-base leading-6 text-charcoal/80">{t.checkoutBody}</p>
            <button type="button" onClick={() => void confirm()} disabled={busy} className={`mt-6 ${btnPrimary} bg-pro! shadow-none!`}>
              {busy && <Loader2 className="size-5 animate-spin" />}
              {t.checkoutConfirm(PLANS[picking].price)}
            </button>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}
