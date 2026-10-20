"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useLang } from "@/lib/i18n";

// Desktop onboarding and sign in: a forest panel on the left (brand + the 3 steps), the form on the right.
// Sign in passes no step: it shows the same 3 steps as what comes next. Phone: hidden.
export function OnboardingAside({ step }: { step?: 1 | 2 | 3 }) {
  const { t } = useLang();
  const steps = [t.obStep1, t.obStep2, t.obStep3];
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[40%] flex-col bg-forest px-14 py-12 text-white lg:flex">
      <Link href="/" className="font-logo text-[32px] leading-none tracking-[-0.96px] text-white">
        mano
      </Link>
      <div className="my-auto">
        <p className="font-serif text-[52px] leading-[52px] tracking-[-1.2px]">
          {t.headline1}
          <br />
          <span className="text-sage">{t.headline2}</span>
        </p>
        <ol className="mt-12 space-y-5">
          {steps.map((label, i) => {
            const n = i + 1;
            const done = !!step && n < step;
            const now = n === step;
            return (
              <li key={label} className={`flex items-center gap-4 text-lg ${now ? "font-bold text-white" : done ? "text-white/80" : "text-white/45"}`}>
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${
                    now ? "bg-white text-forest" : done ? "bg-sage text-forest" : "border border-white/30"
                  }`}
                >
                  {done ? <Check className="size-4" strokeWidth={3} /> : n}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
      </div>
      <p className="text-sm text-white/60">{t.footerLine}</p>
    </aside>
  );
}
