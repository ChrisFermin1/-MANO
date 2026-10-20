"use client";

import { btnPrimary } from "@/components/ui";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingHeader } from "@/components/onboarding-header";
import { loadBusiness, saveBusiness } from "@/lib/business";
import { useLang } from "@/lib/i18n";

const inputClass =
  "h-[52px] w-full rounded-[20px] glass-field px-5 text-base outline-none ring-forest/60 placeholder:text-muted focus:ring-2";

export default function TuNegocio() {
  const { t } = useLang();
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  // came back from step 3: what he already typed
  useEffect(() => {
    const b = loadBusiness();
    if (!b?.businessName) return;
    setOwnerName(b.ownerName ?? "");
    setBusinessName(b.businessName ?? "");
    setPhone(b.phone ?? "");
    setEmail(b.email ?? "");
    setAddress(b.address ?? "");
  }, []);
  // money is on the line: a real name (first + last) on the invoices, and a phone the client can call
  const fullName = /\S+\s+\S+/.test(ownerName.trim());
  const canContinue = fullName && businessName.trim() !== "" && phone.replace(/\D/g, "").length >= 7;

  const next = () => {
    saveBusiness({ ownerName: ownerName.trim(), businessName: businessName.trim(), phone: phone.trim(), email: email.trim(), address: address.trim() });
    router.push("/onboarding/paso-3");
  };

  return (
    <main className="bg-mano-light text-charcoal">
      <div className="mx-auto max-w-[430px] px-[25px] pb-[calc(116px+max(20px,env(safe-area-inset-bottom)))] pt-[calc(16px+env(safe-area-inset-top))]">
        <OnboardingHeader step={2} total={3} backHref="/onboarding/oficio" />

        <h1 className="mt-6 font-serif text-[36px] leading-10 tracking-[-0.72px]">{t.bizTitle}</h1>
        <p className="mt-2 text-base leading-5">{t.bizBody}</p>

        <div className="mt-5 space-y-3">
          <Field label={t.fullName}>
            <input className={inputClass} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Carlos Méndez" autoComplete="name" />
            {ownerName.trim() && !fullName && <span className="mt-1.5 block text-xs font-semibold text-ojo-ink">{t.needLastName}</span>}
          </Field>
          <Field label={t.bizName}>
            <input className={inputClass} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Carlos Painting" autoComplete="organization" />
          </Field>
          <Field label={t.phone}>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" type="tel" inputMode="tel" autoComplete="tel" />
          </Field>
          <Field label={t.bizEmail} hint={t.optional}>
            <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="carlos@email.com" type="email" inputMode="email" autoComplete="email" />
          </Field>
          <Field label={t.bizAddress} hint={t.optional}>
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Atlanta, GA" autoComplete="street-address" />
            <span className="mt-1.5 block text-xs text-muted">{t.bizAddressHint}</span>
          </Field>
        </div>

        {/* pinned to the bottom of the screen (fixed, not height-based): "Siguiente" is always on screen, the form scrolls behind it */}
        </div>
      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-ivory from-75% to-ivory/0 pt-8">
        <div className="mx-auto max-w-[430px] px-[25px] pb-[max(20px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={next}
            disabled={!canContinue}
            className={btnPrimary}
          >
            {t.next} →
          </button>
          <p className="mt-3 text-center text-sm font-medium leading-4 text-muted">{t.changeLater}</p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">
        {label} {hint && <span className="font-normal text-muted">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}
