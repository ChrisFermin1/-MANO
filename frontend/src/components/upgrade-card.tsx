"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n";

// Shown right where a paid feature would be (not hidden on a pricing page): what you'd get + one button.
export function UpgradeCard({ title, body, from }: { title: string; body: string; from: string }) {
  const { t } = useLang();
  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-sage/70 p-4 text-forest sm:flex-row sm:items-center">
      <Sparkles className="hidden size-6 shrink-0 sm:block" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-1 text-sm leading-5 text-forest/80">{body}</p>
      </div>
      <Link
        href={`/planes?from=${from}`}
        className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[12px] bg-forest px-4 text-sm font-bold text-white transition active:scale-[0.98]"
      >
        <Sparkles className="size-4 sm:hidden" strokeWidth={2.25} />
        {t.upgradeCta}
      </Link>
    </div>
  );
}
