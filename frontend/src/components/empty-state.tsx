"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Action = { label: string; href?: string; onClick?: () => void; icon?: LucideIcon };

// A screen with nothing on it yet: an invitation, not an apology. One main action (dark), at most one more.
export function EmptyState({ icon: Icon, title, body, primary, secondary }: { icon: LucideIcon; title: string; body: string; primary: Action; secondary?: Action }) {
  const button = (a: Action, main: boolean) => {
    const cls = `flex h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-bold transition active:scale-[0.98] ${
      main ? "bg-forest text-white" : "border border-forest/25 bg-white text-forest"
    }`;
    const inner = (
      <>
        {a.icon && <a.icon className="size-4" strokeWidth={2.5} />}
        {a.label}
      </>
    );
    return a.href ? (
      <Link href={a.href} className={cls}>
        {inner}
      </Link>
    ) : (
      <button type="button" onClick={a.onClick} className={cls}>
        {inner}
      </button>
    );
  };
  return (
    <section className="mt-6 flex flex-col items-center rounded-[20px] glass px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-sage motion-safe:animate-[pop-in_300ms_ease-out]">
        <Icon className="size-7 text-forest" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 font-serif text-[24px] leading-7 tracking-[-0.4px]">{title}</h2>
      <p className="mt-2 max-w-[22rem] text-sm leading-5 text-charcoal/70">{body}</p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        {button(primary, true)}
        {secondary && button(secondary, false)}
      </div>
    </section>
  );
}
