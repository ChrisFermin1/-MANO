import { ArrowLeft, Phone, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_LABEL, STATUS_COLOR } from "@/app/jobs/page";
import type { Job } from "@/lib/types";

// ── Mock — replace with api.getJob(id) ──────────────────────────────────────
const MOCK_JOBS: Record<string, Job> = {
  j1: {
    id: "j1",
    title: "Bathroom tile repair",
    description: "Fix cracked tiles in the main bathroom. About 6 tiles need replacing.",
    status: "quote_sent",
    quoted_amount: 350,
    quote_text: "Repair 6 cracked bathroom tiles including materials and labour. Work to be completed in one day.",
    missing_fields: null,
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-13T14:00:00Z",
    customer: { id: "c1", name: "Maria Rodriguez", phone: "+1 555 0101", preferred_language: "es" },
  },
  j2: {
    id: "j2",
    title: "Interior painting — 3 rooms",
    description: "Paint living room, kitchen, hallway. Two coats, customer supplies colour.",
    status: "in_progress",
    quoted_amount: 1200,
    quote_text: null,
    missing_fields: null,
    created_at: "2024-01-08T09:00:00Z",
    updated_at: "2024-01-12T11:00:00Z",
    customer: { id: "c2", name: "Tom Nguyen", phone: "+1 555 0202", preferred_language: "en" },
  },
  j3: {
    id: "j3",
    title: "Fence repair",
    description: "Replace broken fence panels on east side.",
    status: "needs_information",
    quoted_amount: null,
    quote_text: null,
    missing_fields: ["address", "price"],
    created_at: "2024-01-14T08:00:00Z",
    updated_at: "2024-01-14T08:00:00Z",
    customer: { id: "c3", name: "Ana Gutierrez", phone: "+1 555 0303", preferred_language: "es" },
  },
};

// ── Ordered status flow ──────────────────────────────────────────────────────
const STATUS_FLOW = [
  "new",
  "needs_information",
  "ready_for_quote",
  "quote_sent",
  "accepted",
  "scheduled",
  "in_progress",
  "completed",
  "payment_pending",
  "paid",
] as const;

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = MOCK_JOBS[id] ?? MOCK_JOBS["j1"]; // swap: const job = await api.getJob(id);

  const currentIdx = STATUS_FLOW.indexOf(job.status as typeof STATUS_FLOW[number]);
  const nextStatus =
    currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1
      ? STATUS_FLOW[currentIdx + 1]
      : null;

  return (
    <main className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-5">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Link href="/jobs" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{job.title}</h1>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[job.status]}`}
        >
          {STATUS_LABEL[job.status]}
        </span>
      </div>

      {/* Ojo — missing fields warning */}
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

      {/* Customer */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Customer
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-base font-semibold text-gray-900">{job.customer.name}</p>
              <p className="text-sm text-gray-500">{job.customer.phone}</p>
            </div>
            <a
              href={`tel:${job.customer.phone}`}
              className={buttonVariants({ variant: "outline", size: "lg" }) + " gap-2 shrink-0"}
            >
              <Phone className="h-4 w-4" />
              Call
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Description
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
        </CardContent>
      </Card>

      {/* Quote amount */}
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

      {/* Status flow — show next step */}
      {nextStatus && (
        <Card className="bg-gray-50">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Next step
            </p>
            <p className="text-sm text-gray-600">
              Move to{" "}
              <span className="font-semibold text-gray-800">{STATUS_LABEL[nextStatus]}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-3 pt-1">
        <Button size="lg" className="w-full gap-2 text-base">
          Let Mano Help
        </Button>
        {nextStatus && (
          <Button size="lg" variant="outline" className="w-full text-base">
            Mark as {STATUS_LABEL[nextStatus]}
          </Button>
        )}
      </div>
    </main>
  );
}
