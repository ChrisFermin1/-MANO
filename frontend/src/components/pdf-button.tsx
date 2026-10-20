"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Loader2, Share2, X } from "lucide-react";
import type { Job } from "@/lib/api";
import type { Business } from "@/lib/business";
import { DocumentCard, pdfName } from "@/components/document";
import { useLang } from "@/lib/i18n";
import { btnGhost, btnPrimary } from "@/components/ui";

type Kind = "estimate" | "invoice";

/** Makes the PDF on the phone (no server). The PDF library is big: it loads only now. */
async function makePdf(kind: Kind, job: Job, biz: Business, view: "en" | "es") {
  const [{ pdf }, { DocumentPdf }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/document-pdf")]);
  const blob = await pdf(<DocumentPdf kind={kind} job={job} biz={biz} view={view} />).toBlob();
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

/** Customer link: "Download PDF" — they already see the document, so it just downloads. */
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
  kind: Kind;
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
      download(await makePdf(kind, job, biz, view));
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

/** Carlos: tap → see exactly what the customer gets (English) → Compartir (WhatsApp, email…) or Descargar.
 *  The PDF is made while he looks, so "Compartir" opens the share sheet right away (iPhone needs the tap). */
export function PdfPreviewButton({
  kind,
  job,
  biz,
  label,
  className,
  compact = false,
  onDone,
}: {
  kind: Kind;
  job: Job;
  biz: Business;
  label: string;
  className: string;
  compact?: boolean; // small text link (the send box's "Copiar · QR · PDF" row)
  onDone?: () => void; // shared or downloaded: counts as sending it
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setFile(null);
    setFailed(false);
    makePdf(kind, job, biz, "en")
      .then((f) => alive && setFile(f))
      .catch((err) => {
        console.warn("PDF failed:", err);
        if (alive) setFailed(true);
      });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden"; // the page behind doesn't scroll
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, kind, job, biz]);

  const canShareFile = !!file && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });

  const share = async () => {
    if (!file) return;
    if (!canShareFile) return save(); // computers without a share sheet: download
    try {
      await navigator.share({ files: [file] });
      onDone?.();
      setOpen(false);
    } catch (err) {
      if ((err as Error).name !== "AbortError") save(); // refused → download instead; closed → nothing
    }
  };
  const save = () => {
    if (!file) return;
    download(file);
    onDone?.();
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Download className={compact ? "size-4" : "size-5"} strokeWidth={compact ? 2 : 2.25} />
        {label}
      </button>

      {open &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={t.pdfPreviewTitle} className="fixed inset-0 z-50 flex flex-col bg-ivory text-charcoal">
            <div className="mx-auto flex w-full max-w-[430px] items-center justify-between gap-3 px-[25px] pb-3 pt-[calc(16px+env(safe-area-inset-top))]">
              <div className="min-w-0">
                <h2 className="font-serif text-[26px] leading-8 tracking-[-0.5px]">{t.pdfPreviewTitle}</h2>
                <p className="text-sm text-charcoal/60">{t.pdfPreviewBody}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.close}
                className="-mr-1 flex size-10 shrink-0 items-center justify-center rounded-full active:bg-black/5"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[430px] px-[25px] pb-4">
                <DocumentCard kind={kind} job={job} biz={biz} view="en" />
              </div>
            </div>

            <div className="mx-auto w-full max-w-[430px] space-y-1 px-[25px] pb-[max(24px,env(safe-area-inset-bottom))] pt-3">
              {failed && <p className="mb-2 text-center text-sm font-semibold text-overdue-ink">{t.pdfFailed}</p>}
              <button type="button" onClick={share} disabled={!file} className={btnPrimary}>
                {file ? <Share2 className="size-5" strokeWidth={2.25} /> : <Loader2 className="size-5 animate-spin" />}
                {file ? t.sharePdf : t.makingPdf}
              </button>
              <button type="button" onClick={save} disabled={!file} className={`${btnGhost} disabled:opacity-40`}>
                <Download className="size-4" strokeWidth={2.25} />
                {t.downloadPdf}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
