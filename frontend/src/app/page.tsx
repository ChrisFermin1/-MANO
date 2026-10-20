"use client";

import Link from "next/link";
import { btnPrimary } from "@/components/ui";
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
    <div className={`flex flex-1 items-center gap-[5px] h-[28px] tiny:h-6 ${side === "left" ? "justify-end" : "justify-start"}`}>
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full bg-forest/60"
          style={{ height: `${h * 100}%`, animation: `wave 1.1s ease-in-out ${delay + i * 0.08}s infinite` }}
        />
      ))}
    </div>
  );
}

export default function Welcome() {
  const { t } = useLang();

  return (
    // Nothing here depends on the screen's height: the content flows from the top with fixed gaps, and the
    // buttons are pinned to the bottom of the screen. (A saved Home Screen app reports one height when it
    // opens and another a moment later, so height-based layouts loaded low and jumped on the first scroll.)
    <main className="bg-mano-light text-charcoal">
      {/* anchored like everything else on this screen: nothing is left to scroll or bounce */}
      <div className="fixed inset-x-0 top-0 z-10 mx-auto max-w-[430px] px-[25px] pt-[max(16px,env(safe-area-inset-top))] tiny:pt-[max(8px,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between">
          <span className="font-logo leading-none tracking-[-0.96px] text-forest text-[28px]">mano</span>
          <LangToggle light />
        </header>
      </div>

      {/* The promise and the demo sit in the middle of the space between the logo and the buttons. Anchored to
      the screen itself (like the pinned buttons), not to a height the phone reports, so the saved app can't jump.
      Logo row: top padding + 35px toggle. Buttons: 24 + 56 + 12 + 16 + bottom padding. */}
      <div className="fixed inset-x-0 top-[calc(max(16px,env(safe-area-inset-top))+43px)] bottom-[calc(108px+max(20px,env(safe-area-inset-bottom)))] flex overflow-y-auto tiny:top-[calc(max(8px,env(safe-area-inset-top))+43px)]">
        <div className="m-auto w-full max-w-[430px] px-[25px]">
          {/* Hierarchy: promise first → the voice demo → the result (estimate) */}
          <section>
            <h1 className="font-serif tracking-[-0.96px] text-[38px] leading-[38px] tiny:text-[28px] tiny:leading-[28px]">
              {t.headline1}
              <br />
              <span className="text-forest">{t.headline2}</span>
            </h1>
            <p className="leading-5 text-charcoal/70 mt-2 text-[15px] tiny:text-[13px] tiny:leading-[17px]">{t.welcomeBody}</p>
          </section>

          {/* Demo: voice → estimate */}
          <div className="h-3 tiny:h-2" />
          <section className="flex flex-col items-center" aria-hidden>
            <div className="flex w-full items-center justify-center gap-3">
              <Wave bars={[...WAVE].reverse()} side="left" />
              <div className="glass flex shrink-0 items-center justify-center rounded-full size-[64px] tiny:size-[40px]">
                <div className="glow-sage flex items-center justify-center rounded-full bg-forest size-[40px] tiny:size-[30px]">
                  <Mic className="text-white size-5 tiny:size-4" strokeWidth={2} />
                </div>
              </div>
              <Wave bars={WAVE} delay={0.4} side="right" />
            </div>
            <p className="text-center text-[15px] font-medium leading-5 text-charcoal/70 mt-2 tiny:mt-1 tiny:text-[13px] tiny:leading-4">{t.welcomeQuote}</p>

            <div className="glass-paper w-full max-w-[340px] rounded-[20px] px-[17px] text-charcoal mt-2.5 pb-3 pt-3.5 tiny:mt-2 tiny:pb-2.5 tiny:pt-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium uppercase leading-none tracking-[1.44px]">
                  Estimate Maria Lopez
                </span>
                <span className="rounded-[5px] bg-sage px-[14px] py-1 font-mono text-xs uppercase leading-none text-forest">
                  English
                </span>
              </div>
              <hr className="border-black/10 mt-2.5 tiny:mt-2" />
              <ul className="space-y-[5px] text-sm leading-5 mt-2.5 tiny:mt-2 tiny:space-y-0.5">
                {ESTIMATE.map((row) => (
                  <li key={row.label} className="flex justify-between">
                    <span>{row.label}</span>
                    <span className="font-bold">{row.amount}</span>
                  </li>
                ))}
              </ul>
              <hr className="border-black/10 mt-3 tiny:mt-2" />
              <div className="mt-[9px] flex items-center justify-between">
                <span className="text-sm leading-5">Total</span>
                <span className="text-xl font-bold leading-5">$1,420</span>
              </div>
            </div>

            <div className="mt-2 flex h-8 tiny:h-7 border border-white/60 bg-peach/90 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl w-full max-w-[291px] items-center justify-center gap-2 rounded-full px-3 text-xs text-charcoal">
              <Eye className="size-6 shrink-0 text-[#b8803f]" strokeWidth={1.75} />
              <p className="leading-5">
                <span className="font-bold">Ojo:</span> {t.ojoHint}
              </p>
            </div>
          </section>

        </div>
      </div>

      {/* pinned to the bottom of the screen, whatever height the phone reports. Same spot as Siguiente/Terminar:
          the link takes the same room as their "Puedes cambiar esto después" line (its tap area is bigger). */}
      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-ivory from-70% to-ivory/0 pt-6">
        <div className="mx-auto max-w-[430px] px-[25px] pb-[max(20px,env(safe-area-inset-bottom))]">
          <Link
            href="/onboarding/oficio"
            className={btnPrimary}
          >
            {t.start} →
          </Link>
          <Link
            href="/inicio"
            onClick={() => resetJobs({ demo: true })}
            className="relative mt-3 block text-center text-sm font-semibold leading-4 text-forest after:absolute after:inset-x-0 after:-inset-y-3"
          >
            {t.haveAccount}
          </Link>
        </div>
      </div>
    </main>
  );
}
