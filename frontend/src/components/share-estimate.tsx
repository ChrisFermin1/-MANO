"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, MessageCircle, QrCode, Send, Share2, Smartphone } from "lucide-react";
import { estimateLink, firstName, isUnsent, markSent, shareCopy, smsLink, whatsappLink, type Job } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { DEMO_BUSINESS, loadBusiness, type Business } from "@/lib/business";
import { PdfButton } from "@/components/pdf-button";
import { shareOrigin } from "@/lib/relay";

// Carlos sends the homeowner a link (WhatsApp/SMS via the phone's share sheet). No app needed on their side.
export function ShareEstimate({
  job,
  dark = false,
  quiet = false,
  onSent,
}: {
  job: Job;
  dark?: boolean;
  quiet?: boolean;
  onSent?: (job: Job) => void; // the first share marks the estimate/invoice as sent
}) {
  const { t, lang } = useLang();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [biz, setBiz] = useState<Business>(DEMO_BUSINESS);
  // already sent: one quiet line ("Mandado el 13 oct · Volver a mandar") until he wants to send again
  const [open, setOpen] = useState(() => isUnsent(job));
  const [english, setEnglish] = useState(false); // Spanish-speaking owner: the English text on request
  // once there's an invoice, the same link shows the invoice
  const invoice = !!job.invoice_number;
  const kind = invoice ? "invoice" : "estimate";
  const msg = shareCopy(job, kind, "link", biz.businessName);

  useEffect(() => {
    // on "localhost" this swaps in the Mac's Wi-Fi address, so the QR/link opens on a phone
    let alive = true;
    shareOrigin().then((origin) => alive && setLink(estimateLink(job, origin)));
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
    setBiz({ ...DEMO_BUSINESS, ...loadBusiness() });
    return () => {
      alive = false;
    };
  }, [job]);

  useEffect(() => {
    if (showQr && link && !qr) QRCode.toDataURL(link, { margin: 1, width: 240, color: { dark: "#073d2d" } }).then(setQr);
  }, [showQr, link, qr]);

  if (!link) return null;

  const sentAt = invoice ? job.invoice_sent_at : job.estimate_sent_at;
  if (!open && sentAt)
    return (
      <div className={`flex items-center gap-2 rounded-[16px] px-4 py-3 text-sm ${dark ? "glass-dark text-white" : "border border-black/[0.06] bg-white"}`}>
        <Check className="size-4 shrink-0 text-forest" strokeWidth={2.75} />
        <span className="min-w-0 flex-1 truncate">{t.sentOn(new Date(sentAt).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric" }))}</span>
        <button type="button" onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-1.5 font-bold text-forest">
          <Send className="size-4" strokeWidth={2.25} /> {t.sendAgain}
        </button>
      </div>
    );

  // Prepared but not sent yet: sharing it (any way) is what makes it "sent"
  const sharing = () => {
    if (isUnsent(job)) void markSent(job.id).then((j) => onSent?.(j));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      sharing();
    } catch {}
  };

  const share = async () => {
    try {
      await navigator.share({ title: msg.title, text: msg.en, url: link });
      sharing();
    } catch {
      // user closed the share sheet — not sent
    }
  };

  const fullText = link ? `${msg.en} ${link}` : "";
  const wa = link ? whatsappLink(job.customer_phone, fullText) : null;
  const sms = link ? smsLink(job.customer_phone, fullText) : null;

  const base = "flex h-12 items-center justify-center gap-2 rounded-[16px] text-sm font-bold transition active:scale-[0.98]";
  const solid = `${base} bg-forest text-white`;
  const outline = `${base} border ${dark ? "border-white/35 text-white" : "border-forest/25 bg-white/50 text-forest"}`;

  return (
    <div className={`rounded-[20px] p-4 ${dark ? "glass-dark" : "glass"}`}>
      <p className={`text-sm font-semibold ${dark ? "text-white" : ""}`}>{(invoice ? t.shareInvoiceWith : t.shareWith)(firstName(job.customer_name))}</p>
      {/* The text that goes with the link, in HIS language; the client gets English (one tap to read it) */}
      <div className={`mt-3 rounded-[12px] px-3 py-2 text-xs leading-4 ${dark ? "bg-white/10" : "bg-ivory"}`}>
        {lang === "es" && !english ? (
          <p lang="es" className={dark ? "text-white/90" : "text-charcoal/75"}>
            “{msg.es}”
          </p>
        ) : (
          <p lang="en" className={dark ? "text-white/90" : "text-charcoal/75"}>
            “{msg.en}”
          </p>
        )}
        {lang === "es" && (
          <button type="button" onClick={() => setEnglish((v) => !v)} className={`mt-1 font-semibold ${dark ? "text-white/70" : "text-forest"}`}>
            {english ? t.hideEnglish : t.showEnglish}
          </button>
        )}
      </div>

      {/* Hierarchy: ONE solid button (WhatsApp, or the share sheet) → Mensaje as outline → Copiar · QR as small links.
          `quiet` (customer hasn't replied, follow-up is the main job now): no solid button here. */}
      {wa && sms ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={wa} target="_blank" rel="noopener" onClick={sharing} className={quiet ? outline : solid}>
            <MessageCircle className="size-4" strokeWidth={2.5} /> {t.sendWhatsApp}
          </a>
          <a href={sms} onClick={sharing} className={outline}>
            <Smartphone className="size-4" strokeWidth={2.5} /> {t.sendSms}
          </a>
        </div>
      ) : (
        canShare && (
          <button type="button" onClick={share} className={`mt-3 w-full ${quiet ? outline : solid}`}>
            <Share2 className="size-4" strokeWidth={2.5} /> {t.shareButton}
          </button>
        )
      )}

      <div className={`mt-3 flex items-center justify-center gap-5 text-sm font-semibold ${dark ? "text-white/80" : "text-forest"}`}>
        <button type="button" onClick={copy} className="flex items-center gap-1.5 py-1">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t.copied : t.copyLink}
        </button>
        <span aria-hidden className={dark ? "text-white/30" : "text-charcoal/20"}>·</span>
        <button
          type="button"
          onClick={() => {
            if (!showQr) sharing(); // the customer scans it from Carlos's screen
            setShowQr((v) => !v);
          }}
          aria-expanded={showQr}
          className="flex items-center gap-1.5 py-1"
        >
          <QrCode className="size-4" /> QR
        </button>
        <span aria-hidden className={dark ? "text-white/30" : "text-charcoal/20"}>·</span>
        {/* the document itself, for email or WhatsApp: the customer's English version */}
        <PdfButton
          kind={invoice ? "invoice" : "estimate"}
          job={job}
          biz={biz}
          share
          label="PDF"
          busyLabel="PDF"
          errorLabel={t.pdfFailed}
          compact
          onDone={sharing}
          className="flex items-center gap-1.5 py-1"
        />
      </div>

      {showQr && qr && (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-[16px] bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={t.qrAlt} width={200} height={200} />
          <p className="text-center text-xs text-muted">{t.qrHint}</p>
        </div>
      )}
    </div>
  );
}
