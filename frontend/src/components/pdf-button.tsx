"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { Job } from "@/lib/api";
import type { Business } from "@/lib/business";
import { pdfName } from "@/components/document";
import { publicFiles, type PublicAttachment } from "@/lib/attachments";
import { getPlan } from "@/lib/plan";

type Kind = "estimate" | "invoice";

/** Makes the PDF on the phone (no server). The PDF library is big: it loads only now. */
export async function makePdf(kind: Kind, job: Job, biz: Business, view: "en" | "es", given?: PublicAttachment[]) {
  // the job's photos go on extra pages (the contractor's phone reads them here; the client's link passes them in)
  const files = given ?? (await publicFiles(job.id));
  // his plan decides "Sent with Mano" (the client's link passes biz from the relay, which already says)
  const branded = { ...biz, hideBranding: biz.hideBranding ?? getPlan().hideBranding };
  const [{ pdf }, { DocumentPdf }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/document-pdf")]);
  const blob = await pdf(<DocumentPdf kind={kind} job={job} biz={branded} view={view} files={files} />).toBlob();
  return new File([blob], pdfName(kind, job), { type: "application/pdf" });
}

/** A real download (iPhone asks "Download?" and saves to Files → Downloads). */
function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** "Descargar PDF" downloads. In the send box (`share`), it sends the PDF itself: the phone's share sheet
 *  (WhatsApp, email…), or a download when there's no share sheet or the phone refuses it. */
export function PdfButton({
  kind,
  job,
  biz,
  view = "en",
  share = false,
  label,
  busyLabel,
  errorLabel,
  className,
  compact = false,
  photos,
  onDone,
}: {
  kind: Kind;
  job: Job;
  biz: Business;
  view?: "en" | "es";
  share?: boolean;
  label: string;
  busyLabel: string;
  errorLabel: string;
  className: string;
  compact?: boolean; // small text link (the send box's "Copiar · QR · PDF" row)
  photos?: PublicAttachment[]; // already loaded (the client's link); otherwise read from this phone
  onDone?: () => void; // shared or downloaded: counts as sending it
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const file = await makePdf(kind, job, biz, view, photos);
      const phone = window.matchMedia("(pointer: coarse)").matches;
      if (share && phone && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          onDone?.();
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") return; // he closed the share sheet: not sent
          // the share sheet can refuse after the wait (no tap anymore): download instead
        }
      }
      download(file);
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
