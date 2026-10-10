"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, AlertTriangle, Sparkles, Check, X } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_LABEL, STATUS_COLOR } from "@/app/jobs/page";
import { getJob, updateJobStatus, STATUS_FLOW } from "@/lib/storage";
import VoiceButton from "@/components/VoiceButton";
import type { Job, JobStatus } from "@/lib/types";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Draft-message state
  const [draftStep, setDraftStep] = useState<"idle" | "loading" | "draft">("idle");
  const [draft, setDraft] = useState<string | null>(null);

  // Status-advance state
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    const found = getJob(id);
    if (found) {
      setJob(found);
    } else {
      setNotFound(true);
    }
  }, [id]);

  // ── Loading / not-found ──────────────────────────────────────────────────
  if (notFound) {
    return (
      <main className="mx-auto max-w-lg px-4 pt-16 pb-24 text-center space-y-4">
        <p className="text-4xl">🔍</p>
        <p className="font-semibold text-gray-700">Job not found</p>
        <Link href="/jobs" className={buttonVariants({ size: "lg" })}>Back to Jobs</Link>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="mx-auto max-w-lg px-4 pt-16 pb-24 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-2/3 rounded bg-gray-200" />
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-20 rounded-xl bg-gray-100" />
        </div>
      </main>
    );
  }

  const currentIdx = STATUS_FLOW.indexOf(job.status as JobStatus);
  const nextStatus: JobStatus | null =
    currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1
      ? STATUS_FLOW[currentIdx + 1]
      : null;

  // ── Advance status ───────────────────────────────────────────────────────
  function handleAdvanceStatus() {
    if (!nextStatus || !job) return;
    setAdvancing(true);
    const updated = updateJobStatus(job.id, nextStatus);
    if (updated) setJob(updated);
    setAdvancing(false);
  }

  // ── Mano Help — draft follow-up message ─────────────────────────────────
  async function handleLetManoHelp() {
    if (!job) return;
    setDraftStep("loading");
    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: job.customer.name,
          jobTitle: job.title,
          status: job.status,
          missingFields: job.missing_fields ?? [],
        }),
      });
      const data = await res.json() as { message?: string };
      setDraft(data.message ?? "Hi, just checking in on your job — let me know if you have any questions!");
      setDraftStep("draft");
    } catch {
      // Fallback draft so the feature always works
      setDraft(
        `Hi ${job.customer.name}, just following up on your ${job.title} job. Let me know if you have any questions or would like to move forward. — Your contractor`
      );
      setDraftStep("draft");
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-5">

      {/* ── Back + title ── */}
      <div className="flex items-center gap-3">
        <Link href="/jobs" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{job.title}</h1>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[job.status]}`}>
          {STATUS_LABEL[job.status]}
        </span>
      </div>

      {/* ── OJO — missing fields ── */}
      {job.missing_fields && job.missing_fields.length > 0 && (
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-4 flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-gray-900 text-sm">OJO — Missing information</p>
              <p className="text-sm text-gray-600">
                Missing{" "}
                <span className="font-medium text-red-700">
                  {job.missing_fields.join(", ")}
                </span>{" "}
                — this job cannot be quoted yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Customer ── */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Customer</p>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-base font-semibold text-gray-900">{job.customer.name}</p>
              {job.customer.phone && (
                <p className="text-sm text-gray-500">{job.customer.phone}</p>
              )}
            </div>
            {job.customer.phone && (
              <a
                href={`tel:${job.customer.phone}`}
                className={buttonVariants({ variant: "outline", size: "lg" }) + " gap-2 shrink-0"}
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Description ── */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
        </CardContent>
      </Card>

      {/* ── Quote ── */}
      {job.quoted_amount !== null && (
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Quote</p>
            <p className="text-2xl font-bold text-gray-900">
              ${job.quoted_amount.toLocaleString()}
            </p>
            {job.quote_text && (
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{job.quote_text}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Next step label ── */}
      {nextStatus && (
        <Card className="bg-gray-50">
          <CardContent className="p-4 space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Next step</p>
            <p className="text-sm text-gray-600">
              Move to{" "}
              <span className="font-semibold text-gray-800">{STATUS_LABEL[nextStatus]}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Mano Help draft ── */}
      {draftStep === "draft" && draft && (
        <Card className="border-purple-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Mano drafted this
                </p>
              </div>
              <VoiceButton text={draft} label="Hear it" />
            </div>
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
                onClick={() => { setDraftStep("idle"); setDraft(null); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Action buttons ── */}
      <div className="space-y-3 pt-1">
        {draftStep !== "draft" && (
          <Button
            size="lg"
            className="w-full gap-2 text-base"
            disabled={draftStep === "loading"}
            onClick={handleLetManoHelp}
          >
            <Sparkles className="h-4 w-4" />
            {draftStep === "loading" ? "Mano is thinking…" : "Let Mano Help"}
          </Button>
        )}
        {nextStatus && (
          <Button
            size="lg"
            variant="outline"
            className="w-full text-base"
            disabled={advancing}
            onClick={handleAdvanceStatus}
          >
            {advancing ? "Updating…" : `Mark as ${STATUS_LABEL[nextStatus]}`}
          </Button>
        )}
        {job.status === "paid" && (
          <div className="text-center py-2">
            <span className="text-sm text-green-600 font-medium">✓ This job is complete and paid</span>
          </div>
        )}
      </div>

      {/* ── Dates ── */}
      <p className="text-xs text-gray-400 text-center">
        Created {new Date(job.created_at).toLocaleDateString()} ·{" "}
        Updated {new Date(job.updated_at).toLocaleDateString()}
      </p>
    </main>
  );
}
