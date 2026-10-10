"use client";

import { useState } from "react";
import { Sparkles, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ── Form shape ────────────────────────────────────────────────────────────────
interface OnboardingForm {
  name: string;
  preferredLanguage: "en" | "es";
  businessName: string;
  trade: string;
  yearsExp: string;
  teamSize: string;
  serviceArea: string;
  avgJobValue: string;
  topChallenge: string;
  currentTools: string;
  goal: string;
}

const TRADES = [
  "Painting", "Plumbing", "Electrical", "Carpentry",
  "Landscaping", "HVAC", "Roofing", "Flooring",
  "General Contracting", "Cleaning", "Concrete", "Other",
];

const CHALLENGES = [
  "Getting paid on time",
  "Finding new customers",
  "Managing multiple jobs at once",
  "Writing quotes fast enough",
  "Following up with leads",
  "Staying organised",
  "Hiring reliable workers",
  "Handling paperwork",
];

const GOALS = [
  "Grow my customer base",
  "Increase my prices",
  "Work fewer hours",
  "Hire my first employee",
  "Get more organised",
  "Improve cash flow",
];

const STEPS = ["You", "Your business", "Operations", "Customers", "Goals"];

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900";

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-800">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  );
}

function ChoiceGrid({ options, value, onSelect, cols = 2 }: {
  options: string[]; value: string; onSelect: (v: string) => void; cols?: 2 | 1;
}) {
  return (
    <div className={`grid gap-2 ${cols === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onSelect(o)}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-colors ${
            value === o
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >{o}</button>
      ))}
    </div>
  );
}

function stepIsValid(step: number, f: OnboardingForm): boolean {
  if (step === 0) return f.name.trim().length > 0;
  if (step === 1) return f.businessName.trim().length > 0 && f.trade.length > 0;
  if (step === 2) return f.teamSize.length > 0 && f.yearsExp.length > 0;
  if (step === 3) return f.serviceArea.trim().length > 0;
  if (step === 4) return f.topChallenge.length > 0 && f.goal.length > 0;
  return false;
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingForm>({
    name: "", preferredLanguage: "en",
    businessName: "", trade: "", yearsExp: "",
    teamSize: "", serviceArea: "", avgJobValue: "",
    topChallenge: "", currentTools: "", goal: "",
  });
  const [loading, setLoading] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  function set<K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    // Set cookie first — so dashboard works even if Gemini fails
    document.cookie = "mano_onboarded=1; path=/; max-age=31536000; SameSite=Lax";

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { welcomeMessage?: string };
      setWelcomeMessage(data.welcomeMessage ?? "Welcome to Mano! Let's get to work.");
    } catch {
      setWelcomeMessage("Welcome to Mano! Let's get started.");
    } finally {
      setLoading(false);
    }
  }

  // ── Welcome screen ────────────────────────────────────────────────────────
  if (welcomeMessage) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            You&apos;re all set, {form.name}!
          </h1>
          <Card className="text-left shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Mano says</p>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed">{welcomeMessage}</p>
            </CardContent>
          </Card>
          <Button size="lg" className="w-full gap-2 text-base" onClick={() => {
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = "/";
          }}>
            Go to my dashboard
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    );
  }

  // ── Questionnaire ─────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-5">

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-gray-900">Mano</h1>
          <p className="text-sm text-gray-500">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? "bg-gray-900" : "bg-gray-200"}`} />
          ))}
        </div>

        {/* Step card */}
        <Card>
          <CardContent className="p-6 space-y-5">

            {/* Step 0 — About you */}
            {step === 0 && (<>
              <Field label="Your first name" required>
                <input type="text" value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Carlos" className={inputClass} autoFocus />
              </Field>
              <Field label="Preferred language">
                <div className="flex gap-2">
                  {(["en", "es"] as const).map((lang) => (
                    <button key={lang} type="button" onClick={() => set("preferredLanguage", lang)}
                      className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                        form.preferredLanguage === lang
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}>
                      {lang === "en" ? "🇺🇸 English" : "🇲🇽 Español"}
                    </button>
                  ))}
                </div>
              </Field>
            </>)}

            {/* Step 1 — Your business */}
            {step === 1 && (<>
              <Field label="Business name" required>
                <input type="text" value={form.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                  placeholder="e.g. Ramirez Painting Co." className={inputClass} />
              </Field>
              <Field label="Your trade" required>
                <ChoiceGrid options={TRADES} value={form.trade} onSelect={(v) => set("trade", v)} />
              </Field>
            </>)}

            {/* Step 2 — Operations */}
            {step === 2 && (<>
              <Field label="Years in business" required>
                <select value={form.yearsExp} onChange={(e) => set("yearsExp", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="less than 1">Less than 1 year</option>
                  <option value="1–3">1–3 years</option>
                  <option value="3–5">3–5 years</option>
                  <option value="5–10">5–10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </Field>
              <Field label="Team size" required>
                <ChoiceGrid options={["Just me", "2–3 people", "4–10 people", "10+ people"]}
                  value={form.teamSize} onSelect={(v) => set("teamSize", v)} />
              </Field>
              <Field label="Average job value" hint="Your typical single job — helps Mano give better quote advice">
                <ChoiceGrid options={["Under $500", "$500–$2k", "$2k–$10k", "$10k+"]}
                  value={form.avgJobValue} onSelect={(v) => set("avgJobValue", v)} />
              </Field>
            </>)}

            {/* Step 3 — Customers */}
            {step === 3 && (<>
              <Field label="Where do you work?" required hint="City, region, or 'all of Texas' — whatever fits">
                <input type="text" value={form.serviceArea}
                  onChange={(e) => set("serviceArea", e.target.value)}
                  placeholder="e.g. Miami, FL" className={inputClass} />
              </Field>
              <Field label="How do customers find you now?" hint="Optional — helps us give better advice">
                <input type="text" value={form.currentTools}
                  onChange={(e) => set("currentTools", e.target.value)}
                  placeholder="e.g. word of mouth, Facebook, Thumbtack" className={inputClass} />
              </Field>
            </>)}

            {/* Step 4 — Goals */}
            {step === 4 && (<>
              <Field label="Biggest challenge right now" required>
                <ChoiceGrid options={CHALLENGES} value={form.topChallenge}
                  onSelect={(v) => set("topChallenge", v)} cols={1} />
              </Field>
              <Field label="Main goal for the next 6 months" required>
                <ChoiceGrid options={GOALS} value={form.goal}
                  onSelect={(v) => set("goal", v)} cols={1} />
              </Field>
            </>)}

          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button size="lg" variant="outline" className="flex-1"
              onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button size="lg" className="flex-1 gap-2"
              disabled={!stepIsValid(step, form)}
              onClick={() => setStep((s) => s + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="lg" className="flex-1 gap-2"
              disabled={!stepIsValid(step, form) || loading}
              onClick={handleSubmit}>
              <Sparkles className="h-4 w-4" />
              {loading ? "Mano is thinking…" : "Let's go!"}
            </Button>
          )}
        </div>

      </div>
    </main>
  );
}
