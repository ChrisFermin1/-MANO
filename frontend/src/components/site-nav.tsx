"use client";

import Link from "next/link";
import { LangToggle } from "@/components/lang-toggle";
import { useLang, type Strings } from "@/lib/i18n";

// Top bar of the public website (tablet and desktop; the phone Welcome has its own).
// Product / Pricing / Resources go in SECTIONS once their pages exist — never as placeholder links.
const SECTIONS: { href: string; label: (t: Strings) => string }[] = [];

const focus = "rounded-[12px] outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";

export function SiteNav({ className = "" }: { className?: string }) {
  const { t } = useLang();
  return (
    <header className={`flex h-24 items-center justify-between gap-8 ${className}`}>
      <Link href="/" aria-label="Mano" className={`-mx-1 px-1 font-logo text-[32px] leading-none tracking-[-0.03em] text-forest ${focus}`}>
        mano
      </Link>

      {SECTIONS.length > 0 && (
        <nav aria-label={t.navMain} className="mr-auto ml-8">
          <ul className="flex items-center gap-2">
            {SECTIONS.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className={`inline-flex h-11 items-center px-3 text-[15px] font-medium text-charcoal/75 hover:text-charcoal ${focus}`}>
                  {s.label(t)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="flex items-center gap-4">
        <LangToggle light compact />
        <Link
          href="/entrar"
          className={`inline-flex h-11 items-center px-3 text-[15px] font-semibold text-forest underline-offset-4 hover:underline ${focus}`}
        >
          {t.logIn}
        </Link>
        <Link
          href="/entrar?crear=1"
          className={`inline-flex h-11 items-center rounded-[12px] bg-forest px-6 text-[15px] font-bold text-white transition hover:bg-forest/90 ${focus}`}
        >
          {t.createAccount} →
        </Link>
      </div>
    </header>
  );
}
