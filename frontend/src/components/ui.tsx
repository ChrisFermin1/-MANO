"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Eye } from "lucide-react";
import type { JobStatus } from "@/lib/api";
import { useLang } from "@/lib/i18n";

export const btnPrimary =
  "flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-forest text-base font-bold text-white shadow-[0_10px_24px_-10px_rgba(15,61,46,0.6)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none desk:inline-flex desk:h-11 desk:w-auto desk:self-start desk:rounded-[12px] desk:px-6 desk:text-[15px] desk:active:scale-100";
export const btnSage =
  "flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-sage text-base font-bold text-forest transition active:scale-[0.98] disabled:opacity-40 desk:inline-flex desk:h-11 desk:w-auto desk:self-start desk:rounded-[12px] desk:px-6 desk:text-[15px] desk:active:scale-100";
// main button on dark green screens and cards
export const btnWhite =
  "flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-white text-base font-bold text-forest transition active:scale-[0.98] disabled:opacity-40 desk:inline-flex desk:h-11 desk:w-auto desk:self-start desk:rounded-[12px] desk:px-6 desk:text-[15px] desk:active:scale-100";
export const btnDanger =
  "flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-overdue-ink text-base font-bold text-white transition active:scale-[0.98] disabled:opacity-40 desk:inline-flex desk:h-11 desk:w-auto desk:self-start desk:rounded-[12px] desk:px-6 desk:text-[15px] desk:active:scale-100";
export const btnSecondary =
  "flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] border border-forest/25 bg-white/50 text-base font-bold text-forest transition active:scale-[0.98] disabled:opacity-40 desk:inline-flex desk:h-11 desk:w-auto desk:self-start desk:rounded-[12px] desk:px-6 desk:text-[15px] desk:active:scale-100";
export const btnGhost =
  "flex h-[48px] w-full items-center justify-center gap-2 rounded-[20px] text-sm font-semibold text-forest desk:inline-flex desk:h-11 desk:w-auto desk:self-start desk:px-3 desk:hover:underline";
export const input =
  "h-[52px] w-full rounded-[14px] glass-field px-4 text-base outline-none ring-forest/60 placeholder:text-muted focus:ring-2";

export function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <main className="min-h-dvh bg-mano-light text-charcoal">
      {/* tablet: a wider centered column (no sidebar yet) · desktop: a wide page aligned to the left (next to the sidebar), height = its content */}
      <div className={`mx-auto flex min-h-dvh max-w-[430px] flex-col px-[25px] pb-[max(32px,env(safe-area-inset-bottom))] pt-[calc(30px+env(safe-area-inset-top))] md:max-w-[720px] md:px-12 lg:mx-0 lg:min-h-0 lg:max-w-[1100px] lg:px-12 lg:pb-16 lg:pt-8 ${className}`}>{children}</div>
    </main>
  );
}

// Phone: a back arrow. Desktop: a breadcrumb to the parent page ("Trabajos ›"); the sidebar does the rest.
export function PageHeader({ backHref, right }: { backHref: string; right?: React.ReactNode }) {
  const { t } = useLang();
  const parent =
    backHref === "/inicio" ? t.navHome : backHref === "/trabajos" ? t.navJobs : backHref.startsWith("/trabajos/") ? t.theJob : t.back;
  return (
    <header className="flex h-10 items-center justify-between">
      <Link href={backHref} aria-label={t.back} className="-ml-1 p-1 lg:hidden">
        <ArrowLeft className="size-7" strokeWidth={1.75} />
      </Link>
      {/* desktop: no "Inicio ›" — the sidebar already goes home */}
      <Link
        href={backHref}
        className={`hidden items-center gap-1 text-sm font-semibold text-muted transition hover:text-forest ${backHref === "/inicio" ? "" : "lg:flex"}`}
      >
        {parent}
        <ChevronRight className="size-4" strokeWidth={2.25} />
      </Link>
      {right && <div className="ml-auto">{right}</div>}
    </header>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="mt-6 font-serif text-[36px] leading-10 tracking-[-0.72px] lg:mt-2 lg:text-[32px] lg:leading-10">{children}</h1>;
}

const STATUS_STYLE: Record<JobStatus, string> = {
  // draft = gray · pending = sand · approved/paid = sage · overdue = clay (Documents)
  NEW: "bg-draft text-draft-ink",
  NEEDS_INFORMATION: "bg-transparent text-pending-ink ring-1 ring-flag/70",
  READY_FOR_QUOTE: "bg-draft text-draft-ink",
  QUOTE_SENT: "bg-pending text-pending-ink",
  ACCEPTED: "bg-sage text-forest",
  SCHEDULED: "bg-forest/10 text-forest",
  IN_PROGRESS: "bg-forest text-white",
  COMPLETED: "bg-forest text-white",
  PAYMENT_PENDING: "bg-pending text-pending-ink",
  PAID: "bg-sage text-forest",
  CANCELLED: "bg-draft text-draft-ink",
};

// invoice: Carlos picked "Factura" on Nuevo trabajo, so "ready" means ready to invoice, not to quote
export function StatusBadge({ status, invoice = false }: { status: JobStatus; invoice?: boolean }) {
  const { t } = useLang();
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-[6px] px-2 py-1 font-mono text-[11px] uppercase leading-none tracking-[0.5px] ${STATUS_STYLE[status]}`}>
      {(status === "ACCEPTED" || status === "PAID") && <Check className="size-3" strokeWidth={3.5} />}
      {invoice && status === "READY_FOR_QUOTE" ? t.readyToInvoice : t.status[status]}
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
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center px-[25px] pb-[max(32px,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
        <div className="flex size-16 items-center justify-center rounded-full bg-sage">
          <Check className="size-8 text-forest" strokeWidth={3} />
        </div>
        <h1 className="mt-6 font-serif text-[48px] leading-[47px] tracking-[-0.96px]">{title}</h1>
        <p className="mt-3 text-base leading-6 text-white/85">{body}</p>
        <div className="mt-10">{children}</div>
      </div>
    </main>
  );
}

export type DocState = "ready" | "sent" | "accepted" | "declined" | "unpaid" | "overdue" | "paid";

const DOC_STATE_STYLE: Record<DocState, string> = {
  ready: "border border-dashed border-draft-ink/40 text-draft-ink",
  sent: "bg-pending text-pending-ink",
  accepted: "bg-sage text-forest",
  declined: "bg-draft text-draft-ink",
  unpaid: "bg-draft text-draft-ink",
  overdue: "bg-overdue text-overdue-ink",
  paid: "bg-sage text-forest",
};

export function DocStateBadge({ state, label }: { state: DocState; label: string }) {
  return (
    <span className={`whitespace-nowrap rounded-[6px] px-2 py-1 font-mono text-[10px] uppercase leading-none ${DOC_STATE_STYLE[state]}`}>{label}</span>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-[3px] md:items-center md:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] rounded-t-[28px] border-t border-white/80 bg-ivory/90 md:max-w-[480px] md:rounded-[24px] md:border md:pb-8 md:pt-6 px-[25px] pb-[max(32px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_-12px_rgba(15,61,46,0.35)] backdrop-blur-2xl"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-black/15 md:hidden" />
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
