"use client";

import Link from "next/link";
import { Eye, Mic } from "lucide-react";
import { LangToggle } from "@/components/lang-toggle";
import { resetJobs } from "@/lib/api";
import { useLang } from "@/lib/i18n";

// one side of the waveform (shown on both sides of the mic, mirrored)
const WAVE = [0.9, 0.55, 1, 0.4, 0.8, 0.5, 0.65, 0.35, 0.5, 0.25];

const ESTIMATE = [
  { label: "Living room and kitchen, 2 coats", amount: "$1,240" },
  { label: "Wall crack repair", amount: "$180" },
];

function Wave({ bars, delay = 0, side }: { bars: number[]; delay?: number; side: "left" | "right" }) {
  return (
    <div className={`flex h-[34px] flex-1 items-center gap-[5px] short:h-[28px] tiny:h-6 ${side === "left" ? "justify-end" : "justify-start"}`}>
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full bg-white/80"
          style={{ height: `${h * 100}%`, animation: `wave 1.1s ease-in-out ${delay + i * 0.08}s infinite` }}
        />
      ))}
    </div>
  );
}

export default function Welcome() {
  const { t } = useLang();

  return (
    // One screen, no scrolling: the gaps (flex-1 spacers) shrink to fit the visible height. min-h (not h) so a
    // phone shorter than planned for can still scroll to the buttons instead of cutting them off
    <main className="min-h-dvh bg-mano-dark bg-mano-photo bg-welcome text-white">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-[27px] pb-[max(20px,env(safe-area-inset-bottom))] tiny:pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] short:pt-4 tiny:pt-2">
        <header className="flex items-center justify-between">
          <span className="font-logo text-[32px] leading-none tracking-[-0.96px] short:text-[28px]">mano</span>
          <LangToggle />
        </header>

        {/* Hierarchy: promise first → the voice demo → the result (estimate) → buttons */}
        <div className="min-h-2 flex-1 basis-0 max-h-[44px]" />
        <section>
          <h1 className="font-serif text-[48px] leading-[47px] tracking-[-0.96px] short:text-[38px] short:leading-[38px] tiny:text-[28px] tiny:leading-[28px]">
            {t.headline1}
            <br />
            <span className="text-lime">{t.headline2}</span>
          </h1>
          <p className="mt-4 text-base leading-5 short:mt-2 short:text-[15px] tiny:text-[13px] tiny:leading-[17px]">{t.welcomeBody}</p>
        </section>

        {/* Demo: voice → estimate */}
        <div className="min-h-2 flex-1 basis-0 max-h-[36px]" />
        <section className="flex flex-col items-center" aria-hidden>
          <div className="flex w-full items-center justify-center gap-4 short:gap-3">
            <Wave bars={[...WAVE].reverse()} side="left" />
            <div className="glass-dark flex size-[84px] shrink-0 items-center justify-center rounded-full short:size-[64px] tiny:size-[40px]">
              <div className="glow-lime flex size-[50px] items-center justify-center rounded-full bg-lime short:size-[40px] tiny:size-[30px]">
                <Mic className="size-[25px] text-forest short:size-5 tiny:size-4" strokeWidth={2} />
              </div>
            </div>
            <Wave bars={WAVE} delay={0.4} side="right" />
          </div>
          <p className="mt-3 text-center text-[15px] font-medium leading-5 text-white/85 short:mt-2 tiny:mt-1 tiny:text-[13px] tiny:leading-4">{t.welcomeQuote}</p>

          <div className="glass-paper mt-[18px] w-full max-w-[340px] rounded-[20px] px-[17px] pb-4 pt-[22px] text-black short:mt-2.5 short:pb-3 short:pt-3.5 tiny:mt-2 tiny:pb-2.5 tiny:pt-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-medium uppercase leading-none tracking-[1.44px]">
                Estimate Maria Lopez
              </span>
              <span className="rounded-[5px] bg-lime/50 px-[14px] py-1 font-mono text-xs uppercase leading-none text-forest">
                English
              </span>
            </div>
            <hr className="mt-3 border-black/10 short:mt-2.5 tiny:mt-2" />
            <ul className="mt-3 space-y-[5px] text-sm leading-5 short:mt-2.5 tiny:mt-2 tiny:space-y-0.5">
              {ESTIMATE.map((row) => (
                <li key={row.label} className="flex justify-between">
                  <span>{row.label}</span>
                  <span className="font-bold">{row.amount}</span>
                </li>
              ))}
            </ul>
            <hr className="mt-6 border-black/10 short:mt-3 tiny:mt-2" />
            <div className="mt-[9px] flex items-center justify-between">
              <span className="text-sm leading-5">Total</span>
              <span className="text-xl font-bold leading-5">$1,420</span>
            </div>
          </div>

          <div className="mt-[11px] short:mt-2 flex h-8 tiny:h-7 border border-white/60 bg-peach/90 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl w-full max-w-[291px] items-center justify-center gap-2 rounded-full px-3 text-xs text-black">
            <Eye className="size-6 shrink-0 text-[#b8803f]" strokeWidth={1.75} />
            <p className="leading-5">
              <span className="font-bold">Ojo:</span> {t.ojoHint}
            </p>
          </div>
        </section>

        <div className="min-h-2 flex-1 basis-0" />
        <div>
          <Link
            href="/onboarding/oficio"
            className="glow-lime flex h-[53px] short:h-[48px] tiny:h-[44px] w-full items-center justify-center rounded-[20px] bg-lime text-sm font-bold text-forest transition active:scale-[0.98]"
          >
            {t.start} →
          </Link>
          <Link
            href="/inicio"
            onClick={() => resetJobs({ demo: true })}
            className="mt-1 block py-3 text-center text-sm font-medium leading-4 short:py-2 tiny:py-1.5"
          >
            {t.haveAccount}
          </Link>
        </div>
      </div>
    </main>
  );
}
