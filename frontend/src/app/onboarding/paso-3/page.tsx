"use client";

import { btnPrimary } from "@/components/ui";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingHeader } from "@/components/onboarding-header";
import { OnboardingAside } from "@/components/onboarding-aside";
import { resetJobs } from "@/lib/api";
import { DUE_OPTIONS, loadBusiness, saveBusiness } from "@/lib/business";
import { useLang } from "@/lib/i18n";

// Step 3: how clients pay him. Its own step so it isn't skipped by accident — it's what gets him paid.
export default function ComoTePagan() {
  const { t } = useLang();
  const router = useRouter();
  const [payInfo, setPayInfo] = useState("");
  const [dueDays, setDueDays] = useState(15);
  useEffect(() => {
    const b = loadBusiness();
    if (b?.payInfo) setPayInfo(b.payInfo);
    if (b?.invoiceDueDays != null) setDueDays(b.invoiceDueDays);
  }, []);

  const finish = () => {
    saveBusiness({ payInfo: payInfo.trim(), invoiceDueDays: dueDays });
    resetJobs({ demo: false });
    router.push("/inicio");
  };

  return (
    <main className="bg-mano-light text-charcoal lg:pl-[40%]">
      <OnboardingAside step={3} />
      <div className="mx-auto max-w-[430px] px-[25px] pb-[calc(116px+max(20px,env(safe-area-inset-bottom)))] pt-[calc(16px+env(safe-area-inset-top))] lg:max-w-[600px] lg:px-12 lg:pt-14 lg:pb-0">
        <OnboardingHeader step={3} total={3} backHref="/onboarding/paso-2" />

        <h1 className="mt-6 font-serif text-[36px] leading-10 tracking-[-0.72px]">{t.payInfo}</h1>
        <p className="mt-2 text-base leading-5">{t.payInfoHint}</p>

        <div className="mt-5 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              {t.payInfo} <span className="font-normal text-muted">· {t.optional}</span>
            </span>
            <textarea
              rows={3}
              className="w-full resize-none rounded-[20px] glass-field px-5 py-3.5 text-base leading-6 outline-none ring-forest/60 placeholder:text-muted focus:ring-2"
              value={payInfo}
              onChange={(e) => setPayInfo(e.target.value)}
              placeholder={t.payInfoPlaceholder}
            />
          </label>
          <div>
            <span className="mb-2 block text-sm font-semibold">{t.dueTerms}</span>
            <div role="radiogroup" aria-label={t.dueTerms} className="grid grid-cols-3 gap-1.5">
              {DUE_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={dueDays === d}
                  onClick={() => setDueDays(d)}
                  className={`h-11 rounded-[14px] text-[13px] font-semibold transition ${dueDays === d ? "bg-forest text-white" : "bg-white text-charcoal"}`}
                >
                  {d === 0 ? t.dueOnReceipt : t.dueDays(d)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* pinned to the bottom of the screen (fixed, not height-based), same spot as the other steps */}
      {/* desktop: right after the form, not pinned to the bottom of the screen */}
      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-ivory from-75% to-ivory/0 pt-8 lg:static lg:bg-none lg:pt-8">
        <div className="mx-auto max-w-[430px] px-[25px] pb-[max(20px,env(safe-area-inset-bottom))] lg:max-w-[600px] lg:px-12 lg:pb-10">
          <button type="button" onClick={finish} className={btnPrimary}>
            {t.finish} →
          </button>
          <p className="mt-3 text-center text-sm font-medium leading-4 text-muted">{t.changeLater}</p>
        </div>
      </div>
    </main>
  );
}
