"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { firstName, jobTotal, money, type Job } from "@/lib/api";
import { useLang } from "@/lib/i18n";

// Pops up on any of Carlos's screens the moment a customer approves an estimate.
// Mock: listens to localStorage changes from the customer tab. Backend version: poll /jobs or use a websocket.
export function ApprovalToast() {
  const { t } = useLang();
  const pathname = usePathname();
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "mano.jobs" || !e.newValue) return;
      try {
        const before: Job[] = e.oldValue ? JSON.parse(e.oldValue) : [];
        const after: Job[] = JSON.parse(e.newValue);
        const newlyApproved = after.find(
          (j) => j.status === "ACCEPTED" && j.approved_by && before.find((b) => b.id === j.id)?.status !== "ACCEPTED",
        );
        if (newlyApproved) setJob(newlyApproved);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!job) return;
    const id = setTimeout(() => setJob(null), 10000);
    return () => clearTimeout(id);
  }, [job]);

  // One signal per screen: the dashboard and that job's page already show the approval themselves,
  // and the customer's own page never shows Carlos's notifications
  if (!job || pathname === "/inicio" || pathname === `/trabajos/${job.id}` || pathname.startsWith("/e/")) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-3">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-[410px] items-center gap-3 rounded-[20px] bg-lime p-3 pr-2 shadow-2xl shadow-forest/30 motion-safe:animate-[toast-in_400ms_cubic-bezier(0.2,0.9,0.3,1.2)]"
      >
        <Link href={`/trabajos/${job.id}`} onClick={() => setJob(null)} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-forest">
            <CheckCircle2 className="size-6 text-lime" />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-bold leading-5 text-forest">{t.toastApproved(firstName(job.customer_name))}</span>
            <span className="block truncate text-sm text-forest/80">{t.toastApprovedSub(money(jobTotal(job)))}</span>
          </span>
        </Link>
        <button type="button" onClick={() => setJob(null)} aria-label={t.close} className="rounded-full p-2 text-forest/70">
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
}
