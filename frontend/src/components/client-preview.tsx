"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PdfButton, makePdf } from "@/components/pdf-button";
import { UpgradeCard } from "@/components/upgrade-card";
import type { Job } from "@/lib/api";
import type { Business } from "@/lib/business";
import { useLang } from "@/lib/i18n";
import { getPlan } from "@/lib/plan";

type Kind = "estimate" | "invoice";

// "Ver como tu cliente": what the client actually gets.
//  · Phone / tablet: two tabs. Link — the real client page (/e/…), approving off. PDF — the real PDF's pages,
//    drawn here with pdf.js (an iPhone can't show a PDF inside a page).
//  · Desktop: the PDF only (that's what gets printed, filed and emailed from a computer).
export function ClientPreview({ kind, job: given, biz: givenBiz, onClose }: { kind: Kind; job: Job; biz: Business; onClose: () => void }) {
  const { t } = useLang();
  // what it looked like when he opened the preview (the page re-renders; the PDF shouldn't remake itself)
  const [{ job, biz }] = useState(() => ({ job: given, biz: givenBiz }));
  // desktop (sidebar layout, ≥1024px): PDF only, no tabs
  const [desktop] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const [tab, setTab] = useState<"link" | "pdf">(desktop ? "pdf" : "link");
  const [branded] = useState(() => !getPlan().hideBranding);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // not prepared yet → no link exists; the client page can still draw it from this phone ("_job-12")
  const params = new URLSearchParams({ preview: kind });
  if (kind === "invoice" && job.invoice_number) params.set("num", String(job.invoice_number));
  if (kind === "invoice" && job.invoice_due_at) params.set("due", job.invoice_due_at);
  const src = `/e/${job.public_token ?? `_job-${job.id}`}?${params}`;

  // on <body>: above the sidebar, whatever the page around it does
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-ivory md:items-center md:justify-center md:bg-black/40 md:p-6" role="dialog" aria-modal="true" aria-label={t.previewTitle}>
      <div className="flex min-h-0 w-full flex-1 flex-col md:max-w-[760px] md:flex-none md:rounded-[24px] md:bg-ivory md:shadow-xl">
        <header className="flex items-center gap-3 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] md:px-6 md:pt-5">
          <button type="button" onClick={onClose} aria-label={t.back} className="-ml-1 p-1">
            <ArrowLeft className="size-6" strokeWidth={1.75} />
          </button>
          <h2 className="flex-1 font-serif text-[24px] leading-7">{t.previewTitle}</h2>
        </header>
        <div className="px-4 md:px-6">
          {!desktop && (
          <div className="glass grid grid-cols-2 rounded-[14px] p-1" role="tablist">
            {(["link", "pdf"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`h-10 rounded-[10px] text-sm font-semibold transition ${tab === k ? "bg-forest text-white" : "text-charcoal/70"}`}
              >
                {k === "link" ? t.previewLink : t.previewPdf}
              </button>
            ))}
          </div>
          )}
          <p className="mt-2 text-sm leading-5 text-charcoal/70">{tab === "link" ? t.previewLinkHint : t.previewPdfHint}</p>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:h-[min(64vh,680px)] md:flex-none md:px-6">
          {tab === "link" ? (
            <div className="mx-auto h-full min-h-[480px] overflow-hidden rounded-[20px] border border-black/10 bg-white md:h-full md:min-h-0 md:w-[390px] md:rounded-[32px] md:border-[6px] md:border-charcoal">
              <iframe src={src} title={t.previewLink} className="size-full" />
            </div>
          ) : (
            <PdfPages kind={kind} job={job} biz={biz} />
          )}
        </div>

        <div className="space-y-3 border-t border-black/5 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 md:px-6 md:pb-5">
          {branded && <UpgradeCard slim title={t.upgradeBrandingTitle} body={t.upgradeBrandingBody} from="branding" />}
          {tab === "pdf" && (
            <PdfButton
              kind={kind}
              job={job}
              biz={biz}
              label={t.downloadPdf}
              busyLabel={t.makingPdf}
              errorLabel={t.pdfFailed}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-forest/25 text-sm font-bold text-forest"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The PDF exactly as it downloads, page by page, as pictures sized to the screen. */
function PdfPages({ kind, job, biz }: { kind: Kind; job: Job; biz: Business }) {
  const { t } = useLang();
  const box = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const file = await makePdf(kind, job, biz, "en");
        // legacy build: works on older iPhones too (the modern one needs iOS 17.4+)
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const width = (box.current?.clientWidth || 360) * Math.min(window.devicePixelRatio || 1, 2);
        const out: string[] = [];
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
          out.push(canvas.toDataURL("image/png"));
        }
        if (!cancelled) setPages(out);
      } catch (e) {
        console.warn("PDF preview failed", e);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, job, biz]);

  return (
    <div ref={box} className="space-y-3">
      {failed ? (
        <p className="py-10 text-center text-sm font-semibold text-overdue-ink">{t.pdfFailed}</p>
      ) : !pages ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 className="size-5 animate-spin" /> {t.makingPdf}
        </p>
      ) : (
        pages.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- a page drawn from the PDF
          <img key={i} src={src} alt={`${t.previewPdf} ${i + 1}/${pages.length}`} className="w-full rounded-[6px] bg-white shadow-sm ring-1 ring-black/10" />
        ))
      )}
    </div>
  );
}
