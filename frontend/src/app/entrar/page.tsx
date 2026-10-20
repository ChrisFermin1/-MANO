"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Mail, Phone } from "lucide-react";
import { LangToggle } from "@/components/lang-toggle";
import { OnboardingAside } from "@/components/onboarding-aside";
import { btnPrimary, input } from "@/components/ui";
import { homeFor, startDemo } from "@/components/auth-gate";
import { RESEND_AFTER_S, sendCode, signInWith, verifyCode, type CodeError } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { formatPhone, isFullPhone, nextPhone } from "@/lib/phone";

type Step = "start" | "email" | "code";

// Sign in and sign up are the same thing: a new person goes to onboarding, someone who already has
// a business goes to Inicio. No passwords: a code by text or email, or Google / Apple.
export default function Entrar() {
  const { t } = useLang();
  const router = useRouter();
  const [step, setStep] = useState<Step>("start");
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<null | "send" | "verify" | "google" | "apple">(null);
  const [error, setError] = useState<CodeError | "send" | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);
  // back in the code box when it opens and after a wrong code (it's disabled while checking)
  useEffect(() => {
    if (step === "code" && !busy) codeRef.current?.focus();
  }, [step, busy]);

  const to = method === "phone" ? phone : email.trim().toLowerCase();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // returning user (already has a business) → Inicio; new → the 3 onboarding steps
  const done = () => router.replace(homeFor());

  const send = async () => {
    setBusy("send");
    setError(null);
    try {
      await sendCode(to);
      setCode("");
      setStep("code");
      setResendIn(RESEND_AFTER_S);
    } catch {
      setError("send");
    } finally {
      setBusy(null);
    }
  };

  const verify = async (value: string) => {
    if (value.length !== 6 || busy) return;
    setBusy("verify");
    setError(null);
    const r = await verifyCode(method, to, value);
    setBusy(null);
    if (typeof r === "string") {
      setError(r);
      setCode("");
    } else done();
  };

  const provider = async (p: "google" | "apple") => {
    setBusy(p);
    await signInWith(p);
    setBusy(null);
    done();
  };

  // for demos: a signed-in example account with sample jobs
  const demo = () => {
    startDemo();
    router.replace("/inicio");
  };

  return (
    <main className="min-h-dvh bg-mano-light text-charcoal lg:pl-[40%]">
      <OnboardingAside />
      <div className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-[25px] pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] lg:justify-center lg:py-12">
        <header className="flex items-center justify-between">
          {step === "start" ? (
            <Link href="/" className="font-logo text-[28px] leading-none tracking-[-0.84px] text-forest lg:invisible">
              mano
            </Link>
          ) : (
            <button type="button" onClick={() => (setStep(step === "code" ? (method === "email" ? "email" : "start") : "start"), setError(null))} aria-label={t.back} className="-ml-1 p-1">
              <ArrowLeft className="size-7" strokeWidth={1.75} />
            </button>
          )}
          <LangToggle light />
        </header>

        {step === "start" && (
          <>
            <h1 className="mt-10 font-serif text-[36px] leading-10 tracking-[-0.72px]">{t.authTitle}</h1>
            <p className="mt-2 text-base leading-6 text-charcoal/70">{t.authBody}</p>

            <label className="mt-8 block">
              <span className="mb-2 block text-sm font-semibold">{t.authPhone}</span>
              <input
                className={input}
                value={phone}
                onChange={(e) => setPhone(nextPhone(phone, e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && isFullPhone(phone) && (setMethod("phone"), void send())}
                placeholder="(555) 123-4567"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
            <button
              type="button"
              onClick={() => (setMethod("phone"), void send())}
              disabled={!isFullPhone(phone) || !!busy}
              className={`mt-3 ${btnPrimary}`}
            >
              {busy === "send" ? <Loader2 className="size-5 animate-spin" /> : <Phone className="size-5" strokeWidth={2.25} />}
              {t.authSendCode}
            </button>

            <div className="my-6 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-black/10" />
              {t.authOr}
              <span className="h-px flex-1 bg-black/10" />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void provider("google")}
                disabled={!!busy}
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[16px] border border-black/15 bg-white text-base font-semibold transition active:scale-[0.98] disabled:opacity-50"
              >
                {busy === "google" ? <Loader2 className="size-5 animate-spin" /> : <GoogleMark />}
                {t.authGoogle}
              </button>
              <button
                type="button"
                onClick={() => void provider("apple")}
                disabled={!!busy}
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[16px] bg-black text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                {busy === "apple" ? <Loader2 className="size-5 animate-spin" /> : <AppleMark />}
                {t.authApple}
              </button>
              <button
                type="button"
                onClick={() => (setMethod("email"), setStep("email"), setError(null))}
                className="flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-forest"
              >
                <Mail className="size-4" strokeWidth={2.25} />
                {t.authUseEmail}
              </button>
            </div>

            <div className="mt-auto pt-10 text-center lg:mt-0">
              <button type="button" onClick={demo} className="text-sm font-semibold text-charcoal/60 underline underline-offset-4">
                {t.authDemo}
              </button>
            </div>
          </>
        )}

        {step === "email" && (
          <>
            <h1 className="mt-10 font-serif text-[32px] leading-9 tracking-[-0.64px]">{t.authEmailTitle}</h1>
            <label className="mt-8 block">
              <span className="mb-2 block text-sm font-semibold">{t.clientEmail}</span>
              <input
                className={input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && validEmail && void send()}
                placeholder="carlos@email.com"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
              />
            </label>
            <button type="button" onClick={() => void send()} disabled={!validEmail || !!busy} className={`mt-3 ${btnPrimary}`}>
              {busy === "send" ? <Loader2 className="size-5 animate-spin" /> : <Mail className="size-5" strokeWidth={2.25} />}
              {t.authSendCode}
            </button>
          </>
        )}

        {step === "code" && (
          <>
            <h1 className="mt-10 font-serif text-[32px] leading-9 tracking-[-0.64px]">{t.authCodeTitle}</h1>
            <p className="mt-2 text-base leading-6 text-charcoal/70">{t.authCodeSentTo(method === "phone" ? formatPhone(phone) : to)}</p>
            <input
              ref={codeRef}
              className={`${input} mt-8 h-16 text-center font-mono text-[28px] tracking-[0.5em]`}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
                setError(null);
                if (v.length === 6) void verify(v); // complete code: check it right away (SMS autofill too)
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label={t.authCodeTitle}
              placeholder="······"
              maxLength={6}
              disabled={busy === "verify" || error === "locked"}
            />
            {busy === "verify" && (
              <p className="mt-3 flex items-center justify-center gap-2 text-sm text-charcoal/60">
                <Loader2 className="size-4 animate-spin" /> {t.authChecking}
              </p>
            )}
            {error && error !== "send" && (
              <p role="alert" className="mt-3 text-center text-sm font-semibold text-overdue-ink">
                {error === "wrong" ? t.authWrong : error === "expired" ? t.authExpired : t.authLocked}
              </p>
            )}
            <div className="mt-6 text-center">
              {resendIn > 0 ? (
                <p className="text-sm text-muted">{t.authResendIn(resendIn)}</p>
              ) : (
                <button type="button" onClick={() => void send()} className="text-sm font-semibold text-forest underline underline-offset-4">
                  {t.authResend}
                </button>
              )}
            </div>
            <p className="mt-auto pt-10 text-center text-xs text-muted lg:mt-0">{t.authFakeNote}</p>
          </>
        )}

        {error === "send" && (
          <p role="alert" className="mt-3 text-center text-sm font-semibold text-overdue-ink">
            {t.authSendFailed}
          </p>
        )}
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-white" aria-hidden>
      <path d="M16.37 12.71c-.02-2.36 1.93-3.5 2.02-3.55-1.1-1.61-2.81-1.83-3.42-1.85-1.45-.15-2.84.86-3.58.86-.75 0-1.88-.84-3.09-.82-1.59.02-3.06.93-3.88 2.35-1.66 2.87-.42 7.12 1.19 9.45.79 1.14 1.73 2.42 2.96 2.37 1.19-.05 1.64-.77 3.07-.77 1.43 0 1.84.77 3.09.74 1.28-.02 2.09-1.16 2.87-2.31.9-1.32 1.27-2.6 1.29-2.67-.03-.01-2.48-.95-2.52-3.8zM14.03 5.78c.65-.79 1.09-1.89.97-2.98-.94.04-2.08.63-2.75 1.41-.6.7-1.13 1.82-.99 2.89 1.05.08 2.12-.53 2.77-1.32z" />
    </svg>
  );
}
