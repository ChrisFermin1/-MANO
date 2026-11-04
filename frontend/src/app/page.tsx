"use client";

import Link from "next/link";
import { btnPrimary } from "@/components/ui";
import { Camera, Eye, FileText, Mic, Wallet } from "lucide-react";
import { LangToggle } from "@/components/lang-toggle";
import { SiteNav } from "@/components/site-nav";
import { startDemo } from "@/components/auth-gate";
import { useLang } from "@/lib/i18n";

// one side of the waveform (shown on both sides of the mic, mirrored)
const WAVE = [0.9, 0.55, 1, 0.4, 0.8, 0.5, 0.65, 0.35, 0.5, 0.25];

const ESTIMATE = [
  { label: "Living room and kitchen, 2 coats", amount: "$1,240" },
  { label: "Wall crack repair", amount: "$180" },
];

function Wave({ bars, delay = 0, side, size = "h-[28px] tiny:h-6" }: { bars: number[]; delay?: number; side: "left" | "right"; size?: string }) {
  return (
    <div className={`flex flex-1 items-center gap-[5px] ${size} ${side === "left" ? "justify-end" : "justify-start"}`}>
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
  return (
    <>
      <div className="md:hidden">
        <WelcomePhone />
      </div>
      <div className="hidden md:block">
        <WelcomeWide />
      </div>
    </>
  );
}

/* ───────── Tablet and desktop: a real landing page ─────────
   One 12-column grid (max 1280px, 64px margins, 32px gutters on desktop) that the top bar, the hero, the
   demo and the benefits all sit on. Hero: copy on 7 columns, demo on 5 (≈ 1.618 : 1); 6 + 6 on a small laptop so
   the estimate doesn't wrap. Spacing comes from
   the 8px scale (8 · 16 · 24 · 32 · 48 · 64 · 96 · 128); type from a golden-ratio scale on 18px
   (18 · 29 · 47 · 76). Tablet stacks the demo, full width, under the copy instead of squeezing two columns. */

const wrap = "mx-auto w-full max-w-[1280px] px-12 xl:px-16";
const grid = "grid grid-cols-12 gap-x-8";

function WelcomeWide() {
  const { t } = useLang();
  const benefits = [
    { icon: Camera, title: t.benefit1Title, body: t.benefit1Body },
    { icon: FileText, title: t.benefit2Title, body: t.benefit2Body },
    { icon: Wallet, title: t.benefit3Title, body: t.benefit3Body },
  ];
  return (
    <div className="flex min-h-screen flex-col bg-mano-light text-charcoal">
      <SiteNav className={wrap} />

      <main className="flex-1">
        <section className={`${wrap} ${grid} gap-y-16 pb-24 pt-16 lg:items-center lg:pb-32 lg:pt-24`}>
          <div className="col-span-12 lg:col-span-6 xl:col-span-7">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-forest/70">{t.heroEyebrow}</p>
            {/* optical: the serif's capitals sit a hair right of the eyebrow, so pull them back */}
            <h1 className="-ml-[0.04em] mt-6 font-serif text-[64px] leading-[1] tracking-[-0.025em] xl:text-[76px]">
              {t.headline1}
              <br />
              <span className="text-forest">{t.headline2}</span>
            </h1>
            <p className="mt-8 max-w-[29rem] text-lg leading-7 text-charcoal/70">{t.welcomeBody}</p>
            <div className="mt-12 flex items-center gap-4">
              <Link
                href="/entrar?crear=1"
                className="flex h-14 items-center rounded-[16px] bg-forest px-8 text-base font-bold text-white shadow-[0_8px_24px_-12px_rgba(7,61,45,0.55)] transition hover:bg-forest/90"
              >
                {t.start} →
              </Link>
              <button
                type="button"
                onClick={startDemo} // the sign-in check then opens Inicio
                className="flex h-14 items-center rounded-[16px] border border-forest/20 px-6 text-base font-semibold text-forest transition hover:bg-white/70"
              >
                {t.seeDemo}
              </button>
            </div>
          </div>

          <Demo />
        </section>

        {/* supporting, not competing: its own band under the hero, same columns */}
        <section className={`${wrap} pb-24`}>
          <ul className={`${grid} border-t border-black/10 pt-12 lg:pt-16`}>
            {benefits.map((b) => (
              <li key={b.title} className="col-span-4">
                <b.icon className="size-6 text-forest" strokeWidth={1.75} />
                <p className="mt-4 text-base font-bold leading-6">{b.title}</p>
                <p className="mt-2 max-w-[18rem] text-[15px] leading-6 text-charcoal/65">{b.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className={`${wrap} pb-12 text-sm text-muted`}>{t.footerLine}</footer>
    </div>
  );
}

// The demo, read top to bottom: he talks (mic) → what Mano heard → the English estimate → Ojo's next step.
// One width for everything under the mic so the story reads as a single column.
function Demo() {
  const { t } = useLang();
  return (
    <div
      className="col-span-12 rounded-[32px] border border-black/5 bg-white/50 px-8 py-12 lg:col-span-6 xl:col-span-5"
      aria-hidden
    >
      <div className="mx-auto flex max-w-[400px] flex-col items-center">
        <div className="flex w-full items-center justify-center gap-4">
          <Wave bars={[...WAVE].reverse()} side="left" size="h-10" />
          <div className="glow-sage flex size-16 shrink-0 items-center justify-center rounded-full bg-forest">
            <Mic className="size-7 text-white" strokeWidth={2} />
          </div>
          <Wave bars={WAVE} delay={0.4} side="right" size="h-10" />
        </div>
        <p className="mt-6 text-center text-[17px] font-medium leading-6 text-charcoal/70">{t.welcomeQuote}</p>

        <div className="mt-8 w-full rounded-[16px] border border-black/[0.06] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-medium uppercase tracking-[0.12em]">Estimate Maria Lopez</span>
            <span className="rounded-[4px] bg-sage px-2 py-1 font-mono text-[11px] uppercase leading-none text-forest">English</span>
          </div>
          <ul className="mt-6 space-y-2 text-[15px] leading-6">
            {ESTIMATE.map((row) => (
              <li key={row.label} className="flex justify-between gap-4">
                <span>{row.label}</span>
                <span className="font-bold tabular-nums">{row.amount}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-black/10 pt-4">
            <span className="text-sm">Total</span>
            <span className="text-2xl font-bold tabular-nums">$1,420</span>
          </div>
        </div>

        <div className="mt-4 flex w-full items-center gap-2 rounded-[16px] bg-peach px-4 py-3 text-sm leading-5">
          <Eye className="size-5 shrink-0 text-ojo" strokeWidth={1.75} />
          <span>
            <span className="font-bold">Ojo:</span> {t.ojoHint}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ───────── Phone: one screen, buttons pinned to the bottom ───────── */

function WelcomePhone() {
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

            <div className="mt-2 flex min-h-8 py-1 tiny:min-h-7 border border-white/60 bg-peach/90 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl w-full max-w-[340px] items-center justify-center gap-2 rounded-full px-3 text-xs text-charcoal">
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
          <Link href="/entrar?crear=1" className={btnPrimary}>
            {t.createAccount} →
          </Link>
          <Link
            href="/entrar"
            className="relative mt-3 block text-center text-sm font-semibold leading-4 text-forest after:absolute after:inset-x-0 after:-inset-y-3"
          >
            {t.logIn}
          </Link>
        </div>
      </div>
    </main>
  );
}
