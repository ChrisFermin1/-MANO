"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { Job } from "@/lib/api";
import type { Business } from "@/lib/business";
import { pdfName } from "@/components/document";

/** Makes the PDF on the phone (no server) and hands it over: the share sheet on a phone
 *  (save to Files, WhatsApp, AirDrop), a normal download on a computer. */
export function PdfButton({
  kind,
  job,
  biz,
  view = "en",
  label,
  busyLabel,
  errorLabel,
  className,
  compact = false,
  onDone,
}: {
  kind: "estimate" | "invoice";
  job: Job;
  biz: Business;
  view?: "en" | "es";
  label: string;
  busyLabel: string;
  errorLabel: string;
  className: string;
  compact?: boolean; // small text link (the share box's "Copiar · QR · PDF" row)
  onDone?: () => void; // shared or downloaded: counts as sending it
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async () => {
    setBusy(true);
    setFailed(false);
    try {
      // the PDF library is big: load it only now
      const [{ pdf }, { DocumentPdf }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/document-pdf")]);
      const blob = await pdf(<DocumentPdf kind={kind} job={job} biz={biz} view={view} />).toBlob();
      const name = pdfName(kind, job);
      const file = new File([blob], name, { type: "application/pdf" });
      const phone = window.matchMedia("(pointer: coarse)").matches;
      if (phone && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          onDone?.();
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") return; // he closed the share sheet
          // the share sheet can refuse after the wait (no tap anymore): fall back to a download
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      onDone?.();
    } catch (err) {
      console.warn("PDF failed:", err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const icon = compact ? "size-4" : "size-5";
  if (compact)
    return (
      <button type="button" onClick={run} disabled={busy} className={className} title={failed ? errorLabel : undefined}>
        {busy ? <Loader2 className={`${icon} animate-spin`} /> : <Download className={icon} />}
        {failed ? "!" : label}
      </button>
    );
  return (
    <>
      <button type="button" onClick={run} disabled={busy} className={className}>
        {busy ? <Loader2 className={`${icon} animate-spin`} /> : <Download className={icon} strokeWidth={2.25} />}
        {busy ? busyLabel : label}
      </button>
      {failed && <p className="mt-2 text-center text-sm font-semibold text-overdue-ink">{errorLabel}</p>}
    </>
  );
}
