"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n";

// Shown right where a paid feature would be (not hidden on a pricing page): what you'd get + one button.
// `slim`: one line, for tight spots (the preview's footer) — the title is the whole pitch.
export function UpgradeCard({ title, body, from, slim = false }: { title: string; body: string; from: string; slim?: boolean }) {
  const { t } = useLang();
  if (slim)
    return (
      <Link
        href={`/planes?from=${from}`}
        className="flex items-center gap-2 rounded-[12px] bg-pro-tint px-3 py-2.5 text-sm font-semibold text-pro-ink transition active:scale-[0.99]"
      >
        <Sparkles className="size-4 shrink-0 text-pro" strokeWidth={2.25} />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span className="shrink-0 font-bold text-pro">Solo →</span>
      </Link>
    );
  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-pro-tint p-4 text-pro-ink sm:flex-row sm:items-center">
      <Sparkles className="hidden size-6 shrink-0 sm:block" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-1 text-sm leading-5 text-pro-soft">{body}</p>
      </div>
      <Link
        href={`/planes?from=${from}`}
        className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[12px] bg-pro px-4 text-sm font-bold text-white transition hover:bg-pro/90 active:scale-[0.98]"
      >
        <Sparkles className="size-4 sm:hidden" strokeWidth={2.25} />
        {t.upgradeCta}
      </Link>
    </div>
  );
}
