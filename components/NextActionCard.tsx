"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { NextAction } from "@/lib/types";

interface NextActionCardProps {
  action: NextAction;
}

// Mock draft — remove when api.draftFollowUp() is wired up
const MOCK_DRAFT =
  "Hi Maria, just checking in on the bathroom tile quote I sent over. Let me know if you have any questions or if you'd like to move forward. — Carlos";

export default function NextActionCard({ action }: NextActionCardProps) {
  const [step, setStep] = useState<"idle" | "loading" | "draft">("idle");
  const [draft, setDraft] = useState<string | null>(null);

  async function handleLetManoHelp() {
    setStep("loading");
    // TODO: replace with api.draftFollowUp(action.job_id)
    await new Promise((r) => setTimeout(r, 800));
    setDraft(MOCK_DRAFT);
    setStep("draft");
  }

  function handleDismiss() {
    setStep("idle");
    setDraft(null);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-800">Your Next Action</h2>

      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          {/* Action label */}
          <div className="flex items-start justify-between gap-3">
            <p className="text-base text-gray-800 font-medium leading-snug">
              {action.label}
            </p>
            <Link
              href={`/jobs/${action.job_id}`}
              className="shrink-0 text-xs text-blue-600 hover:underline"
            >
              View job →
            </Link>
          </div>

          {/* Draft message */}
          {step === "draft" && draft && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Mano drafted this message
              </p>
              <p className="text-sm text-gray-800 leading-relaxed">{draft}</p>
              <div className="flex gap-2">
                <Button size="lg" className="flex-1 gap-2">
                  <Check className="h-4 w-4" />
                  Approve &amp; Send
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="shrink-0"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* CTA */}
          {step !== "draft" && (
            <Button
              size="lg"
              variant="secondary"
              className="w-full gap-2"
              disabled={step === "loading"}
              onClick={handleLetManoHelp}
            >
              <Sparkles className="h-4 w-4" />
              {step === "loading" ? "Mano is thinking…" : "Let Mano Help"}
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
