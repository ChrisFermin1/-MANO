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
}: {
  kind: "estimate" | "invoice";
  job: Job;
  biz: Business;
  view?: "en" | "es";
  label: string;
  busyLabel: string;
  errorLabel: string;
  className: string;
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
    } catch (err) {
      console.warn("PDF failed:", err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={run} disabled={busy} className={className}>
        {busy ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" strokeWidth={2.25} />}
        {busy ? busyLabel : label}
      </button>
      {failed && <p className="mt-2 text-center text-sm font-semibold text-overdue-ink">{errorLabel}</p>}
    </>
  );
}
