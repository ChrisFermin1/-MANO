"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, MessageCircle, QrCode, Share2, Smartphone } from "lucide-react";
import { estimateLink, firstName, fmtDate, jobTotal, money, smsLink, whatsappLink, type Job } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { shareOrigin } from "@/lib/relay";

// Carlos sends the homeowner a link (WhatsApp/SMS via the phone's share sheet). No app needed on their side.
export function ShareEstimate({ job, dark = false, quiet = false }: { job: Job; dark?: boolean; quiet?: boolean }) {
  const { t, lang } = useLang();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const n = firstName(job.customer_name);
  // once there's an invoice, the same link shows the invoice
  const invoice = !!job.invoice_number;
  const due = job.invoice_due_at ? fmtDate(job.invoice_due_at, "en") : "";
  const dueEs = job.invoice_due_at ? fmtDate(job.invoice_due_at, "es") : "";
  const msg = invoice
    ? {
        en: `Hi ${n}, here's your invoice for ${money(jobTotal(job))}${due ? `, due ${due}` : ""}. You can see it here:`,
        es: `Hola ${n}, aquí está tu factura por ${money(jobTotal(job))}${dueEs ? `, vence el ${dueEs}` : ""}. La puedes ver aquí:`,
      }
    : {
        en: `Hi ${n}, here's your estimate. You can review and approve it here:`,
        es: `Hola ${n}, aquí está tu estimado. Lo puedes revisar y aprobar aquí:`,
      };

  useEffect(() => {
    // on "localhost" this swaps in the Mac's Wi-Fi address, so the QR/link opens on a phone
    let alive = true;
    shareOrigin().then((origin) => alive && setLink(estimateLink(job, origin)));
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
    return () => {
      alive = false;
    };
  }, [job]);

  useEffect(() => {
    if (showQr && link && !qr) QRCode.toDataURL(link, { margin: 1, width: 240, color: { dark: "#0f3d2e" } }).then(setQr);
  }, [showQr, link, qr]);

  if (!link) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const share = async () => {
    try {
      await navigator.share({ title: invoice ? "Invoice" : "Estimate", text: msg.en, url: link });
    } catch {
      // user closed the share sheet — nothing to do
    }
  };

  const fullText = link ? `${msg.en} ${link}` : "";
  const wa = link ? whatsappLink(job.customer_phone, fullText) : null;
  const sms = link ? smsLink(job.customer_phone, fullText) : null;

  const base = "flex h-12 items-center justify-center gap-2 rounded-[16px] text-sm font-bold transition active:scale-[0.98]";
  const solid = `${base} bg-lime text-forest`;
  const outline = `${base} border ${dark ? "border-white/35 text-white" : "border-forest/25 bg-white/50 text-forest"}`;

  return (
    <div className={`rounded-[20px] p-4 ${dark ? "glass-dark" : "glass"}`}>
      <p className={`text-sm font-semibold ${dark ? "text-white" : ""}`}>{(invoice ? t.shareInvoiceWith : t.shareWith)(firstName(job.customer_name))}</p>
      <p className={`mt-1 truncate font-mono text-xs ${dark ? "text-white/60" : "text-muted"}`}>{link}</p>

      {/* The text that goes with the link — English for the customer; Spanish meaning for Carlos */}
      <div className={`mt-3 rounded-[12px] px-3 py-2 text-xs leading-4 ${dark ? "bg-white/10" : "bg-white/60"}`}>
        <p lang="en" className={dark ? "text-white/90" : "text-black/75"}>
          “{msg.en}”
        </p>
        {lang === "es" && (
          <p lang="es" className={`mt-1 ${dark ? "text-white/50" : "text-black/45"}`}>
            {t.meaning}: “{msg.es}”
          </p>
        )}
      </div>

      {/* Hierarchy: ONE solid button (WhatsApp, or the share sheet) → Mensaje as outline → Copiar · QR as small links.
          `quiet` (customer hasn't replied, follow-up is the main job now): no solid button here. */}
      {wa && sms ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={wa} target="_blank" rel="noopener" className={quiet ? outline : solid}>
            <MessageCircle className="size-4" strokeWidth={2.5} /> {t.sendWhatsApp}
          </a>
          <a href={sms} className={outline}>
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
        <span aria-hidden className={dark ? "text-white/30" : "text-black/20"}>·</span>
        <button type="button" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr} className="flex items-center gap-1.5 py-1">
          <QrCode className="size-4" /> QR
        </button>
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
