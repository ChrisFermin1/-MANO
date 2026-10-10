"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ManoExtraction } from "@/lib/types";

// Field labels for the extraction preview
const FIELD_LABELS: Record<keyof ManoExtraction, string> = {
  service: "Service",
  customer_name: "Customer",
  rooms: "Rooms",
  trim_repair: "Trim repair",
  start_date: "Start date",
  price: "Price",
  address: "Address",
};

function ExtractionPreview({ data }: { data: ManoExtraction }) {
  const entries = Object.entries(data) as [keyof ManoExtraction, unknown][];
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Mano understood this
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {entries.map(([key, value]) => {
          const missing = value === null || value === undefined;
          return (
            <div key={key} className="space-y-0.5">
              <dt className="text-xs text-gray-400 font-medium">{FIELD_LABELS[key]}</dt>
              <dd
                className={`text-sm font-semibold ${
                  missing ? "text-red-400 italic" : "text-gray-800"
                }`}
              >
                {missing
                  ? "missing"
                  : typeof value === "boolean"
                  ? value
                    ? "Yes"
                    : "No"
                  : String(value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

// Mock extraction — remove when api.extractJob() is wired up
async function mockExtract(text: string): Promise<ManoExtraction> {
  await new Promise((r) => setTimeout(r, 900));
  const lower = text.toLowerCase();
  return {
    service: lower.includes("paint")
      ? "Interior Painting"
      : lower.includes("tile")
      ? "Tile Repair"
      : "General Service",
    customer_name: lower.match(/for (\w+)/i)?.[1] ?? null,
    rooms: lower.match(/(\d+)\s+room/i)
      ? parseInt(lower.match(/(\d+)\s+room/i)![1])
      : null,
    trim_repair: lower.includes("trim") ? true : null,
    start_date: lower.match(/october\s+(\d+)/i)
      ? "2026-10-" + lower.match(/october\s+(\d+)/i)![1].padStart(2, "0")
      : null,
    price: null,
    address: lower.match(/(on\s+\w+\s+street|st\.|ave\.|dr\.)/i)
      ? lower.match(/(on\s+[\w\s]+(?:street|st\.|ave\.|dr\.))/i)?.[0]?.replace("on ", "") ?? null
      : null,
  };
}

export default function NewJobPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [extraction, setExtraction] = useState<ManoExtraction | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handlePreview() {
    if (!description.trim()) return;
    setExtracting(true);
    try {
      // TODO: replace with api.extractJob(description)
      const result = await mockExtract(description);
      setExtraction(result);
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      // TODO: replace with api.createJob({ description }) then router.push(`/jobs/${job.id}`)
      await new Promise((r) => setTimeout(r, 600));
      router.push("/jobs");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/jobs" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Job</h1>
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="description"
                className="block text-base font-semibold text-gray-800"
              >
                Describe the job
              </label>
              <p className="text-sm text-gray-500">
                English or Spanish — write naturally. Mano will figure it out.
              </p>
              <textarea
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setExtraction(null); // clear preview on edit
                }}
                placeholder="e.g. Paint 3 rooms for Maria on Oak Street, starting October 13"
                rows={5}
                className="w-full rounded-lg border border-gray-300 p-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Mano preview */}
            {extraction && <ExtractionPreview data={extraction} />}

            {/* Preview button */}
            {!extraction && (
              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="w-full gap-2"
                disabled={!description.trim() || extracting}
                onClick={handlePreview}
              >
                <Sparkles className="h-4 w-4" />
                {extracting ? "Mano is reading…" : "Preview with Mano"}
              </Button>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full text-base"
              disabled={!description.trim() || submitting}
            >
              {submitting ? "Saving…" : "Create Job"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
