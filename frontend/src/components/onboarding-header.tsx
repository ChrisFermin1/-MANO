"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function OnboardingHeader({ step, total, backHref }: { step: number; total: number; backHref: string }) {
  const { t } = useLang();

  return (
    // arrow · progress (shrinks on small phones, never wider than 3 × 59px) · "paso 2 de 3" on one line
    <header className="flex items-center gap-4">
      <Link href={backHref} aria-label={t.back} className="-ml-1 shrink-0 p-1">
        <ArrowLeft className="size-7" strokeWidth={1.75} />
      </Link>
      <div className="mx-auto flex w-full max-w-[193px] gap-2 lg:invisible" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-[3px] flex-1 rounded-full ${i < step ? "bg-forest" : "bg-track"}`} />
        ))}
      </div>
      <span className="shrink-0 whitespace-nowrap text-sm text-muted">{t.step(step, total)}</span>
    </header>
  );
}
