"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function OnboardingHeader({ step, total, backHref }: { step: number; total: number; backHref: string }) {
  const { t } = useLang();

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center">
      <Link href={backHref} aria-label={t.back} className="-ml-1 w-fit p-1">
        <ArrowLeft className="size-7" strokeWidth={1.75} />
      </Link>
      <div className="flex gap-2" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-[3px] w-[59px] ${i < step ? "bg-forest" : "bg-track"}`} />
        ))}
      </div>
      <span className="justify-self-end text-sm text-muted">{t.step(step, total)}</span>
    </header>
  );
}
