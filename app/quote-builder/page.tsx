"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Check, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import VoiceButton from "@/components/VoiceButton";

interface QuoteOption {
  tier: "basic" | "standard" | "premium";
  title: string;
  description: string;
  price: string;
  includes: string[];
}

const TIER_STYLE = {
  basic:    { label: "Basic",    border: "border-gray-200", badge: "bg-gray-100 text-gray-600",    ring: "ring-gray-900" },
  standard: { label: "Standard", border: "border-blue-200", badge: "bg-blue-100 text-blue-700",    ring: "ring-blue-600" },
  premium:  { label: "Premium",  border: "border-amber-200",badge: "bg-amber-100 text-amber-700",  ring: "ring-amber-500" },
};

export default function QuoteBuilderPage() {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<QuoteOption[] | null>(null);
  const [selected, setSelected] = useState<QuoteOption | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!notes.trim()) return;
    setLoading(true);
    setError(null);
    setQuotes(null);
    setSelected(null);

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          trade: "General Contracting",   // TODO: read from user profile once DB is wired
          businessName: "My Business",     // TODO: read from user profile
          preferredLanguage: "en",
        }),
      });
      const data = await res.json() as { quotes?: QuoteOption[] };
      if (!data.quotes?.length) throw new Error("No quotes returned");
      setQuotes(data.quotes);
    } catch {
      setError("Couldn't generate quotes right now. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Selected quote confirmation ───────────────────────────────────────────
  if (selected) {
    const style = TIER_STYLE[selected.tier];
    return (
      <main className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(null)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Quote Ready</h1>
          </div>
          <VoiceButton
            label="Hear quote"
            text={`${selected.title}. ${selected.description}. Price: ${selected.price}. Includes: ${selected.includes.join(", ")}.`}
          />
        </div>

        <Card className={`border-2 ${style.border}`}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}>
                {style.label}
              </span>
              <span className="text-2xl font-bold text-gray-900">{selected.price}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{selected.title}</p>
              <p className="text-sm text-gray-500 mt-1">{selected.description}</p>
            </div>
            <div className="space-y-1.5">
              {selected.includes.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Job notes</p>
          <p className="text-sm text-gray-700 leading-relaxed">{notes}</p>
        </div>

        <div className="space-y-3">
          <Button size="lg" className="w-full gap-2 text-base">
            <Check className="h-4 w-4" />
            Use this quote
          </Button>
          <Button size="lg" variant="outline" className="w-full text-base"
            onClick={() => setSelected(null)}>
            Back to options
          </Button>
        </div>
      </main>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quote Builder</h1>
          <p className="text-xs text-gray-500">Describe the job — Mano gives you 3 options</p>
        </div>
      </div>

      {/* Notes input */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-800">
              Job notes
            </label>
            <p className="text-xs text-gray-400">
              Include: what needs doing, location, size, materials, anything unusual.
              The more detail, the better the quotes.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`e.g. Paint 3 bedrooms and a hallway for a 1,400 sq ft house in Austin. Customer wants eggshell white throughout. Walls only, no trim. Two coats needed — walls are currently dark red. Move furniture included.`}
              rows={6}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none leading-relaxed"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button size="lg" className="w-full gap-2 text-base"
            disabled={!notes.trim() || loading}
            onClick={handleGenerate}>
            <Sparkles className="h-4 w-4" />
            {loading ? "Mano is building your quotes…" : "Generate 3 quotes"}
          </Button>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 animate-pulse">
              <div className="flex justify-between">
                <div className="h-5 w-20 rounded-full bg-gray-200" />
                <div className="h-6 w-24 rounded bg-gray-200" />
              </div>
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-gray-100" />
                <div className="h-3 w-5/6 rounded bg-gray-100" />
                <div className="h-3 w-4/6 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quote options */}
      {quotes && !loading && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Pick the best fit
          </p>
          {quotes.map((quote) => {
            const style = TIER_STYLE[quote.tier];
            return (
              <button
                key={quote.tier}
                onClick={() => setSelected(quote)}
                className={`w-full text-left rounded-xl border-2 ${style.border} bg-white p-5 space-y-3 hover:ring-2 ${style.ring} transition-all`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
                      {style.label}
                    </span>
                    <p className="font-semibold text-gray-900 mt-1">{quote.title}</p>
                    <p className="text-sm text-gray-500">{quote.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-bold text-gray-900">{quote.price}</p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-gray-100">
                  {quote.includes.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-1 text-xs font-medium text-gray-400 pt-1">
                  Select this quote
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}

    </main>
  );
}
