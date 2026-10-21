"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CloudUpload, Loader2, PartyPopper } from "lucide-react";
import { Screen, btnGhost, btnPrimary } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { importToServer, localSnapshot, skipImportForNow, type ImportStep, type Snapshot } from "@/lib/import";

const STEPS: ImportStep[] = ["business", "clients", "jobs", "files"];

// First real sign-in: "this phone has 23 jobs and 9 clients — put them in your account?"
export default function Importar() {
  const { t } = useLang();
  const router = useRouter();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [state, setState] = useState<"ready" | "uploading" | "done" | "failed">("ready");
  const [step, setStep] = useState<ImportStep | null>(null);

  useEffect(() => void localSnapshot().then(setSnap), []);
  if (!snap) return <Screen>{null}</Screen>;

  const start = async () => {
    setState("uploading");
    try {
      await importToServer(setStep);
      setState("done");
    } catch {
      setState("failed");
    }
  };

  const items = [
    { n: snap.jobs, label: t.importJobs(snap.jobs) },
    { n: snap.clients, label: t.importClients(snap.clients) },
    { n: snap.invoices, label: t.importInvoices(snap.invoices) },
    { n: snap.payments, label: t.importPayments(snap.payments) },
    { n: snap.files, label: t.importFiles(snap.files) },
  ].filter((i) => i.n > 0);

  return (
    <Screen className="lg:max-w-[560px]! lg:mx-auto!">
      <div className="flex flex-1 flex-col justify-center py-6">
        <span
          className={`flex size-16 items-center justify-center rounded-full ${state === "done" ? "bg-sage motion-safe:animate-[pop-in_300ms_ease-out]" : "bg-sage"}`}
        >
          {state === "done" ? <PartyPopper className="size-8 text-forest" strokeWidth={1.75} /> : <CloudUpload className="size-8 text-forest" strokeWidth={1.75} />}
        </span>

        <h1 className="mt-6 font-serif text-[32px] leading-9 tracking-[-0.6px]">
          {state === "done" ? t.importDoneTitle(snap.jobs, snap.clients) : t.importTitle}
        </h1>
        <p className="mt-2 text-base leading-6 text-charcoal/70">{state === "done" ? t.importDoneBody : t.importBody}</p>

        {/* what goes up, and (while uploading) where it's at */}
        {state !== "done" && (
          <ul className="mt-6 space-y-2 rounded-[20px] glass p-5 text-[15px]">
            {state === "ready"
              ? [snap.business ? t.importBusiness : null, ...items.map((i) => i.label)].filter(Boolean).map((label) => (
                  <li key={label} className="flex items-center gap-3">
                    <Check className="size-4 shrink-0 text-forest" strokeWidth={2.75} /> {label}
                  </li>
                ))
              : STEPS.map((s) => {
                  const i = STEPS.indexOf(s);
                  const at = step ? STEPS.indexOf(step) : -1;
                  const done = i < at;
                  const now = i === at;
                  return (
                    <li key={s} className={`flex items-center gap-3 ${done || now ? "" : "text-charcoal/40"}`}>
                      {done ? (
                        <Check className="size-4 shrink-0 text-forest" strokeWidth={2.75} />
                      ) : now ? (
                        <Loader2 className="size-4 shrink-0 animate-spin text-forest" />
                      ) : (
                        <span className="size-4 shrink-0 rounded-full border border-black/20" />
                      )}
                      {t.importStep[s]}
                    </li>
                  );
                })}
          </ul>
        )}

        {state === "failed" && (
          <p role="alert" className="mt-4 text-sm font-semibold text-overdue-ink">
            {t.importFailed}
          </p>
        )}

        <div className="mt-8 space-y-1">
          {state === "done" ? (
            <button type="button" onClick={() => router.replace("/inicio")} className={btnPrimary}>
              {t.importGoHome} →
            </button>
          ) : (
            <>
              <button type="button" onClick={() => void start()} disabled={state === "uploading"} className={btnPrimary}>
                {state === "uploading" ? <Loader2 className="size-5 animate-spin" /> : <CloudUpload className="size-5" strokeWidth={2.25} />}
                {state === "failed" ? t.importRetry : t.importStart}
              </button>
              {state !== "uploading" && (
                <button
                  type="button"
                  onClick={() => {
                    skipImportForNow();
                    router.replace("/inicio");
                  }}
                  className={btnGhost}
                >
                  {t.importLater}
                </button>
              )}
            </>
          )}
        </div>
        {state === "ready" && <p className="mt-4 text-center text-xs leading-4 text-muted">{t.importSafe}</p>}
      </div>
    </Screen>
  );
}
