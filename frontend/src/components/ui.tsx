"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eye } from "lucide-react";
import type { JobStatus } from "@/lib/api";
import { useLang } from "@/lib/i18n";

export const btnPrimary =
  "flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-forest text-base font-bold text-lime shadow-[0_10px_24px_-10px_rgba(15,61,46,0.6)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none";
export const btnLime =
  "flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-lime text-base font-bold text-forest transition active:scale-[0.98] disabled:opacity-40";
export const btnDanger =
  "flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-[#8a2a17] text-base font-bold text-white transition active:scale-[0.98] disabled:opacity-40";
export const btnGhost =
  "flex h-[48px] w-full items-center justify-center gap-2 rounded-[20px] text-sm font-semibold text-forest";
export const input =
  "h-[52px] w-full rounded-[14px] glass-field px-4 text-base outline-none ring-forest/60 placeholder:text-muted focus:ring-2";

export function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <main className="min-h-dvh bg-mano-light text-black">
      <div className={`mx-auto flex min-h-dvh max-w-[430px] flex-col px-[25px] pb-8 pt-[30px] ${className}`}>{children}</div>
    </main>
  );
}

export function PageHeader({ backHref, right }: { backHref: string; right?: React.ReactNode }) {
  const { t } = useLang();
  return (
    <header className="flex h-10 items-center justify-between">
      <Link href={backHref} aria-label={t.back} className="-ml-1 p-1">
        <ArrowLeft className="size-7" strokeWidth={1.75} />
      </Link>
      {right}
    </header>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="mt-6 font-serif text-[36px] leading-10 tracking-[-0.72px]">{children}</h1>;
}

const STATUS_STYLE: Record<JobStatus, string> = {
  NEW: "bg-track text-black",
  NEEDS_INFORMATION: "bg-transparent text-ojo-ink ring-1 ring-flag/70",
  READY_FOR_QUOTE: "bg-lime/50 text-forest",
  QUOTE_SENT: "bg-forest/10 text-forest",
  ACCEPTED: "bg-lime text-forest",
  SCHEDULED: "bg-forest/10 text-forest",
  IN_PROGRESS: "bg-forest text-lime",
  COMPLETED: "bg-forest text-white",
  PAYMENT_PENDING: "bg-peach text-[#7a4a12]",
  PAID: "bg-lime text-forest",
  CANCELLED: "bg-black/10 text-black/60",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const { t } = useLang();
  return (
    <span className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-1 font-mono text-[11px] uppercase leading-none tracking-[0.5px] ${STATUS_STYLE[status]}`}>
      {(status === "ACCEPTED" || status === "PAID") && <Check className="size-3" strokeWidth={3.5} />}
      {t.status[status]}
    </span>
  );
}

export function OjoNote({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex gap-2 rounded-[14px] glass-peach px-4 py-3 text-sm leading-5 ${className}`}>
      <Eye className="mt-[-1px] size-6 shrink-0 text-[#b8803f]" strokeWidth={1.75} />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function SuccessScreen({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-mano-dark text-white">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center px-[25px] pb-8">
        <div className="flex size-16 items-center justify-center rounded-full bg-lime">
          <Check className="size-8 text-forest" strokeWidth={3} />
        </div>
        <h1 className="mt-6 font-serif text-[48px] leading-[47px] tracking-[-0.96px]">{title}</h1>
        <p className="mt-3 text-base leading-6 text-white/85">{body}</p>
        <div className="mt-10">{children}</div>
      </div>
    </main>
  );
}

export type DocState = "sent" | "accepted" | "declined" | "unpaid" | "overdue" | "paid";

const DOC_STATE_STYLE: Record<DocState, string> = {
  sent: "bg-forest/10 text-forest",
  accepted: "bg-lime/50 text-forest",
  declined: "bg-black/10 text-black/60",
  unpaid: "bg-peach text-[#7a4a12]",
  overdue: "bg-[#f6c9c0] text-[#8a2a17]",
  paid: "bg-lime text-forest",
};

export function DocStateBadge({ state, label }: { state: DocState; label: string }) {
  return (
    <span className={`rounded-[6px] px-2 py-1 font-mono text-[10px] uppercase leading-none ${DOC_STATE_STYLE[state]}`}>{label}</span>
  );
}

// Bottom sheet for confirmations — thumb-reachable on a phone, closes on backdrop tap or Escape
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-[3px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] rounded-t-[28px] border-t border-white/80 bg-[#f4f6f1]/90 px-[25px] pb-8 pt-3 shadow-[0_-12px_40px_-12px_rgba(15,61,46,0.35)] backdrop-blur-2xl"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-black/15" />
        <h2 className="font-serif text-[28px] leading-8 tracking-[-0.56px]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// Text box that grows to fit its text (no cut-off line items). Enter finishes editing instead of adding a new line.
export function AutoTextarea({
  value,
  onChange,
  className = "",
  ...rest
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className={`resize-none overflow-hidden ${className}`}
      {...rest}
    />
  );
}
