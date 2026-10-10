"use client";

// ── Onboarding questionnaire ──────────────────────────────────────────────────
// Shown to new contractors after their first sign-in.
// Collects basic profile info → sends to Gemini → shows personalised welcome.
//
// HOW THE GEMINI CALL WORKS HERE:
//   1. Contractor fills in the form and submits
//   2. We POST to /api/onboarding (our own server route)
//   3. That route calls Gemini with a tailored prompt
//   4. Gemini returns a personalised welcome message
//   5. We show it to the contractor before sending them to the dashboard

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ── Form shape ────────────────────────────────────────────────────────────────
interface OnboardingForm {
  name: string;
  businessName: string;
  trade: string;
  yearsExp: string;
  topChallenge: string;
  preferredLanguage: "en" | "es";
}

const TRADES = [
  "Painting",
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Landscaping",
  "HVAC",
  "Roofing",
  "Flooring",
  "General Contracting",
  "Other",
];

const CHALLENGES = [
  "Getting paid on time",
  "Finding new customers",
  "Managing multiple jobs",
  "Writing quotes fast enough",
  "Following up with leads",
  "Staying organised",
];

// ── Step indicators ───────────────────────────────────────────────────────────
const STEPS = ["About you", "Your business", "Your goals"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingForm>({
    name: "",
    businessName: "",
    trade: "",
    yearsExp: "",
    topChallenge: "",
    preferredLanguage: "en",
  });
  const [loading, setLoading] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  function set<K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      // POST to our server route which calls Gemini
      // See app/api/onboarding/route.ts for how this works
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { welcomeMessage?: string };
      setWelcomeMessage(data.welcomeMessage ?? "Welcome to Mano! Let's get to work.");

      // ── Mark onboarding complete ──────────────────────────────────────────
      // The middleware reads this cookie to decide whether to redirect to
      // /onboarding or let the user through to the dashboard.
      // Expires in 365 days — effectively permanent for hackathon purposes.
      document.cookie = "mano_onboarded=1; path=/; max-age=31536000; SameSite=Lax";
    } catch {
      setWelcomeMessage("Welcome to Mano! Let's get started.");
    } finally {
      setLoading(false);
    }
  }

  // ── Welcome screen (shown after Gemini responds) ──────────────────────────
  if (welcomeMessage) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              You&apos;re all set, {form.name}!
            </h1>
          </div>
          <Card className="text-left shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Mano says
                </p>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed">{welcomeMessage}</p>
            </CardContent>
          </Card>
          <Button
            size="lg"
            className="w-full gap-2 text-base"
            onClick={() => router.push("/")}
          >
            Go to my dashboard
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    );
  }

  // ── Questionnaire steps ───────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-gray-900">Mano</h1>
          <p className="text-sm text-gray-500">
            Tell us about your business — takes 60 seconds
          </p>
        </div>

        {/* Step pills */}
        <div className="flex gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 space-y-1">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  i <= step ? "bg-gray-900" : "bg-gray-200"
                }`}
              />
              <p
                className={`text-xs text-center ${
                  i === step ? "font-semibold text-gray-800" : "text-gray-400"
                }`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Step content */}
        <Card>
          <CardContent className="p-6 space-y-5">
            {step === 0 && (
              <>
                <Field label="Your first name" required>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g. Carlos"
                    className={inputClass}
                  />
                </Field>
                <Field label="Preferred language">
                  <div className="flex gap-2">
                    {(["en", "es"] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => set("preferredLanguage", lang)}
                        className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                          form.preferredLanguage === lang
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {lang === "en" ? "🇺🇸 English" : "🇲🇽 Español"}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="Business name" required>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => set("businessName", e.target.value)}
                    placeholder="e.g. Ramirez Painting Co."
                    className={inputClass}
                  />
                </Field>
                <Field label="Your trade" required>
                  <div className="grid grid-cols-2 gap-2">
                    {TRADES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => set("trade", t)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium text-left transition-colors ${
                          form.trade === t
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Years in business">
                  <select
                    value={form.yearsExp}
                    onChange={(e) => set("yearsExp", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    <option value="less than 1">Less than 1 year</option>
                    <option value="1-3">1–3 years</option>
                    <option value="3-5">3–5 years</option>
                    <option value="5-10">5–10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </Field>
              </>
            )}

            {step === 2 && (
              <Field label="What's your biggest challenge right now?" required>
                <div className="space-y-2">
                  {CHALLENGES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set("topChallenge", c)}
                      className={`w-full rounded-lg border px-4 py-3 text-sm font-medium text-left transition-colors ${
                        form.topChallenge === c
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
          )}

          {step < STEPS.length - 1 ? (
            <Button
              size="lg"
              className="flex-1 gap-2"
              disabled={!stepIsValid(step, form)}
              onClick={() => setStep((s) => s + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="flex-1 gap-2"
              disabled={!stepIsValid(step, form) || loading}
              onClick={handleSubmit}
            >
              <Sparkles className="h-4 w-4" />
              {loading ? "Mano is thinking…" : "Let's go!"}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function stepIsValid(step: number, form: OnboardingForm): boolean {
  if (step === 0) return form.name.trim().length > 0;
  if (step === 1) return form.businessName.trim().length > 0 && form.trade.length > 0;
  if (step === 2) return form.topChallenge.length > 0;
  return false;
}
