"use client";

import Link from "next/link";
import { Eye, Mic } from "lucide-react";
import { LangToggle } from "@/components/lang-toggle";
import { resetJobs } from "@/lib/api";
import { useLang } from "@/lib/i18n";

const WAVE = [0.5, 0.8, 0.35, 1, 0.6, 0.9, 0.45, 0.75, 1, 0.5, 0.85, 0.4, 0.7, 0.55];

const ESTIMATE = [
  { label: "Living room and kitchen, 2 coats", amount: "$1,240" },
  { label: "Wall crack repair", amount: "$180" },
];

export default function Welcome() {
  const { t } = useLang();

  return (
    <main className="min-h-dvh bg-mano-dark bg-mano-photo bg-welcome text-white">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-[27px] pb-8 pt-[30px]">
        <header className="flex items-center justify-between">
          <span className="font-logo text-[32px] leading-none tracking-[-0.96px]">mano</span>
          <LangToggle />
        </header>

        {/* Demo: voice → estimate */}
        <section className="mt-[60px] flex flex-col items-center" aria-hidden>
          <div className="glass-dark flex size-[84px] items-center justify-center rounded-full">
          <div className="glow-lime flex size-[50px] items-center justify-center rounded-full bg-lime">
            <Mic className="size-[25px] text-forest" strokeWidth={2} />
          </div>
          </div>
          <p className="mt-5 text-center text-base font-semibold leading-5">{t.welcomeQuote}</p>
          <div className="mt-6 flex h-[30px] items-center gap-[6px]">
            {WAVE.map((h, i) => (
              <span
                key={i}
                className="w-[2.5px] rounded-full bg-white"
                style={{
                  height: `${h * 100}%`,
                  animation: `wave 1.1s ease-in-out ${i * 0.08}s infinite`,
                }}
              />
            ))}
          </div>

          <div className="glass-paper mt-[25px] w-full max-w-[340px] rounded-[20px] px-[17px] pb-4 pt-[22px] text-black">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-medium uppercase leading-none tracking-[1.44px]">
                Estimate Maria Lopez
              </span>
              <span className="rounded-[5px] bg-lime/50 px-[14px] py-1 font-mono text-xs uppercase leading-none text-forest">
                English
              </span>
            </div>
            <hr className="mt-3 border-black/10" />
            <ul className="mt-3 space-y-[5px] text-sm leading-5">
              {ESTIMATE.map((row) => (
                <li key={row.label} className="flex justify-between">
                  <span>{row.label}</span>
                  <span className="font-bold">{row.amount}</span>
                </li>
              ))}
            </ul>
            <hr className="mt-6 border-black/10" />
            <div className="mt-[9px] flex items-center justify-between">
              <span className="text-sm leading-5">Total</span>
              <span className="text-xl font-bold leading-5">$1,420</span>
            </div>
          </div>

          <div className="mt-[11px] flex h-8 border border-white/60 bg-peach/90 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl w-full max-w-[291px] items-center justify-center gap-2 rounded-full px-3 text-xs text-black">
            <Eye className="size-6 shrink-0 text-[#b8803f]" strokeWidth={1.75} />
            <p className="leading-5">
              <span className="font-bold">Ojo:</span> {t.ojoHint}
            </p>
          </div>
        </section>

        {/* Pitch */}
        <section className="mt-[59px]">
          <h1 className="font-serif text-[48px] leading-[47px] tracking-[-0.96px]">
            {t.headline1}
            <br />
            <span className="text-lime">{t.headline2}</span>
          </h1>
          <p className="mt-4 text-base leading-5">{t.welcomeBody}</p>
        </section>

        <div className="mt-auto pt-8">
          <Link
            href="/onboarding/oficio"
            className="glow-lime flex h-[53px] w-full items-center justify-center rounded-[20px] bg-lime text-sm font-bold text-forest transition active:scale-[0.98]"
          >
            {t.start} →
          </Link>
          <Link
            href="/inicio"
            onClick={() => resetJobs({ demo: true })}
            className="mt-4 block text-center text-sm font-medium leading-4"
          >
            {t.haveAccount}
          </Link>
        </div>
      </div>
    </main>
  );
}
