"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingHeader } from "@/components/onboarding-header";
import { resetJobs } from "@/lib/api";
import { saveBusiness } from "@/lib/business";
import { useLang } from "@/lib/i18n";

const inputClass =
  "h-[56px] w-full rounded-[20px] bg-white px-5 text-base outline-none ring-forest/60 placeholder:text-muted focus:ring-2";

export default function TuNegocio() {
  const { t } = useLang();
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const canFinish = ownerName.trim() !== "" && businessName.trim() !== "";

  const finish = () => {
    saveBusiness({ ownerName: ownerName.trim(), businessName: businessName.trim(), phone: phone.trim() });
    resetJobs({ demo: false });
    router.push("/inicio");
  };

  return (
    <main className="min-h-dvh bg-cream text-black">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-[25px] pb-8 pt-[33px]">
        <OnboardingHeader step={2} total={2} backHref="/onboarding/oficio" />

        <h1 className="mt-[50px] font-serif text-[36px] leading-10 tracking-[-0.72px]">{t.bizTitle}</h1>
        <p className="mt-2 text-base leading-5">{t.bizBody}</p>

        <div className="mt-8 space-y-4">
          <Field label={t.yourName}>
            <input className={inputClass} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Carlos" autoComplete="given-name" />
          </Field>
          <Field label={t.bizName}>
            <input className={inputClass} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Carlos Painting" autoComplete="organization" />
          </Field>
          <Field label={t.phone} hint={t.optional}>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" type="tel" inputMode="tel" autoComplete="tel" />
          </Field>
        </div>

        <div className="mt-auto pt-10">
          <button
            type="button"
            onClick={finish}
            disabled={!canFinish}
            className="flex h-[53px] w-full items-center justify-center rounded-[20px] bg-forest text-sm font-bold text-lime transition active:scale-[0.98] disabled:opacity-40"
          >
            {t.finish} →
          </button>
          <p className="mt-4 text-center text-sm font-medium leading-4 text-muted">{t.changeLater}</p>
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
