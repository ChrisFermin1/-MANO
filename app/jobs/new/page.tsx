"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Sparkles, Check } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addJob } from "@/lib/storage";
import type { ManoExtraction } from "@/lib/types";

// ── Field config ──────────────────────────────────────────────────────────────
const FIELD_META: {
  key: keyof ManoExtraction;
  label: string;
  type: string;
  placeholder: string;
  required?: boolean;
}[] = [
  { key: "service",       label: "Service",     type: "text",   placeholder: "e.g. Interior Painting", required: true },
  { key: "customer_name", label: "Customer",    type: "text",   placeholder: "e.g. Juan",              required: true },
  { key: "address",       label: "Address",     type: "text",   placeholder: "e.g. 104 Lanyard Bend, Peachtree City" },
  { key: "start_date",    label: "Start date",  type: "date",   placeholder: "" },
  { key: "price",         label: "Price ($)",   type: "number", placeholder: "e.g. 700" },
  { key: "rooms",         label: "Rooms",       type: "number", placeholder: "e.g. 4" },
  { key: "trim_repair",   label: "Trim repair", type: "text",   placeholder: "Yes / No" },
];

type Edits = Partial<Record<keyof ManoExtraction, string>>;

// ── Local regex extractor — works with no API key ─────────────────────────────
// Runs instantly. Gemini then runs in the background and improves the results.
function localExtract(text: string): Edits {
  const t = text.toLowerCase();
  const result: Edits = {};

  // Service
  if (t.includes("paint"))   result.service = "Interior Painting";
  else if (t.includes("tile"))  result.service = "Tile Repair";
  else if (t.includes("plumb")) result.service = "Plumbing";
  else if (t.includes("roof"))  result.service = "Roofing";
  else if (t.includes("floor")) result.service = "Flooring";
  else if (t.includes("electric") || t.includes("electrical")) result.service = "Electrical";
  else if (t.includes("clean")) result.service = "Cleaning";
  else if (t.includes("landscape") || t.includes("lawn")) result.service = "Landscaping";
  else if (t.includes("fence")) result.service = "Fence Repair";
  else if (t.includes("deck") || t.includes("patio")) result.service = "Deck / Patio";
  else if (t.includes("hvac") || t.includes("ac ") || t.includes(" ac")) result.service = "HVAC";

  // Customer name — "juan wants", "for maria", "client tom", "customer: Ana"
  const nameMatch = text.match(
    /^(\w+)\s+wants|for\s+([A-Z][a-z]+)|client\s+(?:is\s+)?([A-Z][a-z]+)|customer[:\s]+([A-Z][a-z]+)/i
  );
  if (nameMatch) {
    result.customer_name = (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4]);
  }

  // Rooms — "4 rooms", "four rooms", "3-bedroom"
  const roomMatch = t.match(/(\d+)\s*(?:room|bedroom|bed)/);
  if (roomMatch) result.rooms = roomMatch[1];

  // Price — "$700", "700 dollars", "charge 700", "charging $700", "im going to charge 700"
  const priceMatch = text.match(/\$\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(?:dollars?|USD)|(?:charg(?:e|ing)|for|price[:\s]+)\s*\$?\s*(\d+(?:[.,]\d+)?)/i);
  if (priceMatch) {
    const raw = priceMatch[1] || priceMatch[2] || priceMatch[3];
    result.price = raw.replace(",", "");
  }

  // Date — "10/14/2026", "10/14", "october 14", "oct 14th", "starting on X"
  const datePatterns = [
    // MM/DD/YYYY or MM/DD
    { re: /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/, handler: (m: RegExpMatchArray) => {
      const y = m[3] || "2026";
      return `${y}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
    }},
    // Month name + day
    { re: /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+(\d{4}))?/i,
      handler: (m: RegExpMatchArray) => {
        const months: Record<string,string> = { jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12" };
        const mo = months[m[1].slice(0,3).toLowerCase()];
        const y = m[3] || "2026";
        return `${y}-${mo}-${m[2].padStart(2,"0")}`;
      }
    },
  ];
  for (const { re, handler } of datePatterns) {
    const m = text.match(re);
    if (m) { result.start_date = handler(m); break; }
  }

  // Address — look for street number + street name patterns
  const addrMatch = text.match(/\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4}(?:\s+(?:St|Ave|Blvd|Dr|Rd|Ln|Bend|Way|Ct|Cir|Pl|Trail|Run)\b[^,]*)?(?:,\s*[A-Za-z\s]+)?/);
  if (addrMatch) result.address = addrMatch[0].trim();

  // Trim repair
  if (t.includes("trim")) result.trim_repair = "Yes";

  return result;
}

// ── Gemini extraction (background improvement) ────────────────────────────────
async function extractWithGemini(description: string): Promise<Edits> {
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
  if (!res.ok) throw new Error("API error");
  const data = await res.json() as ManoExtraction;

  // Convert ManoExtraction nulls to empty strings for the edits map
  const result: Edits = {};
  for (const { key } of FIELD_META) {
    const val = data[key];
    if (val === null || val === undefined) continue;
    if (key === "trim_repair") { result[key] = val ? "Yes" : "No"; continue; }
    result[key] = String(val);
  }
  return result;
}

export default function NewJobPage() {
  const [description, setDescription] = useState("");
  const [edits, setEdits] = useState<Edits>({});
  const [showFields, setShowFields] = useState(false);
  const [improving, setImproving] = useState(false);   // Gemini running in bg
  const [submitting, setSubmitting] = useState(false);
  const geminiRan = useRef(false);

  function handleDescriptionChange(val: string) {
    setDescription(val);
    // Reset if user clears the field
    if (!val.trim()) {
      setShowFields(false);
      setEdits({});
      geminiRan.current = false;
    }
  }

  function handleExtract() {
    if (!description.trim()) return;

    // 1. Local regex — instant, always works
    const local = localExtract(description);
    setEdits(local);
    setShowFields(true);
    geminiRan.current = false;

    // 2. Gemini in background — silently improves the fields
    if (process.env.NEXT_PUBLIC_GEMINI_AVAILABLE !== "false") {
      setImproving(true);
      extractWithGemini(description)
        .then((better) => {
          // Only overwrite fields that Gemini found AND local left empty
          setEdits((prev) => {
            const merged = { ...prev };
            for (const [k, v] of Object.entries(better)) {
              if (v && !prev[k as keyof ManoExtraction]) {
                merged[k as keyof ManoExtraction] = v;
              }
            }
            return merged;
          });
          geminiRan.current = true;
        })
        .catch(() => { /* Gemini failed — local results already shown */ })
        .finally(() => setImproving(false));
    }
  }

  function handleEdit(key: keyof ManoExtraction, value: string) {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }

  function buildTitle(): string {
    const service = edits.service?.trim() || "New Job";
    const customer = edits.customer_name?.trim();
    return customer ? `${service} — ${customer}` : service;
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const newJob = {
        id: `local-${Date.now()}`,
        title: buildTitle(),
        description,
        status: "new" as const,
        quoted_amount: edits.price ? parseFloat(edits.price) : null,
        quote_text: null,
        missing_fields: FIELD_META
          .filter(({ key, required }) => required && !edits[key]?.trim())
          .map(({ label }) => label.toLowerCase()),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer: {
          id: `cust-${Date.now()}`,
          name: edits.customer_name?.trim() || "Unknown customer",
          phone: "",
          preferred_language: "en" as const,
        },
      };

      addJob(newJob);

      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/jobs";
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !!edits.customer_name?.trim() && !!edits.service?.trim();
  const filledCount = FIELD_META.filter(({ key }) => edits[key]?.trim()).length;

  return (
    <main className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/jobs" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Job</h1>
      </div>

      {/* Step 1 — Description */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="description" className="block text-base font-semibold text-gray-800">
              Describe the job
            </label>
            <p className="text-xs text-gray-400">
              Include customer name, address, price, and date. English or Spanish.
            </p>
            <textarea
              id="description"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={"e.g. Juan wants 4 rooms painted starting October 14th, 104 Lanyard Bend Peachtree City, charging $700"}
              rows={4}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full gap-2"
            disabled={!description.trim()}
            onClick={handleExtract}
          >
            <Sparkles className="h-4 w-4" />
            Read with Mano
          </Button>
        </CardContent>
      </Card>

      {/* Step 2 — Editable fields */}
      {showFields && (
        <Card>
          <CardContent className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">
                Review &amp; complete
              </p>
              <div className="flex items-center gap-2">
                {improving && (
                  <span className="text-xs text-purple-600 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 animate-pulse" />
                    Mano improving…
                  </span>
                )}
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                  filledCount === FIELD_META.length
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {filledCount}/{FIELD_META.length} filled
                </span>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              {FIELD_META.map(({ key, label, type, placeholder, required }) => (
                <div key={key} className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type={type}
                    value={edits[key] ?? ""}
                    onChange={(e) => handleEdit(key, e.target.value)}
                    placeholder={placeholder}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-colors ${
                      required && !edits[key]?.trim()
                        ? "border-red-300 bg-red-50"
                        : !edits[key]?.trim()
                        ? "border-amber-200 bg-amber-50"
                        : "border-gray-200 bg-white"
                    }`}
                  />
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full gap-2"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
            >
              <Check className="h-4 w-4" />
              {submitting ? "Saving…" : "Save Job"}
            </Button>

            {!canSubmit && (
              <p className="text-xs text-center text-gray-400">
                Fill in Customer and Service to save.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
