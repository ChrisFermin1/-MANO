import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Job, JobStatus } from "@/lib/types";

// ── Mock data — replace with api.getJobs() ──────────────────────────────────
const MOCK_JOBS: Job[] = [
  {
    id: "j1",
    title: "Bathroom tile repair",
    description: "Fix cracked tiles in main bathroom",
    status: "quote_sent",
    quoted_amount: 350,
    quote_text: null,
    missing_fields: null,
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-13T14:00:00Z",
    customer: { id: "c1", name: "Maria Rodriguez", phone: "+1 555 0101", preferred_language: "es" },
  },
  {
    id: "j2",
    title: "Interior painting — 3 rooms",
    description: "Paint living room, kitchen, hallway",
    status: "in_progress",
    quoted_amount: 1200,
    quote_text: null,
    missing_fields: null,
    created_at: "2024-01-08T09:00:00Z",
    updated_at: "2024-01-12T11:00:00Z",
    customer: { id: "c2", name: "Tom Nguyen", phone: "+1 555 0202", preferred_language: "en" },
  },
  {
    id: "j3",
    title: "Fence repair",
    description: "Replace broken fence panels on east side",
    status: "needs_information",
    quoted_amount: null,
    quote_text: null,
    missing_fields: ["address", "price"],
    created_at: "2024-01-14T08:00:00Z",
    updated_at: "2024-01-14T08:00:00Z",
    customer: { id: "c3", name: "Ana Gutierrez", phone: "+1 555 0303", preferred_language: "es" },
  },
  {
    id: "j4",
    title: "Deck power washing",
    description: "Full deck and patio power wash",
    status: "accepted",
    quoted_amount: 280,
    quote_text: null,
    missing_fields: null,
    created_at: "2024-01-09T07:00:00Z",
    updated_at: "2024-01-15T09:00:00Z",
    customer: { id: "c4", name: "James Park", phone: "+1 555 0404", preferred_language: "en" },
  },
  {
    id: "j5",
    title: "Kitchen faucet replacement",
    description: "Replace kitchen faucet and fix under-sink leak",
    status: "payment_pending",
    quoted_amount: 175,
    quote_text: null,
    missing_fields: null,
    created_at: "2024-01-05T10:00:00Z",
    updated_at: "2024-01-16T15:00:00Z",
    customer: { id: "c5", name: "Linda Chen", phone: "+1 555 0505", preferred_language: "en" },
  },
];

export const STATUS_LABEL: Record<JobStatus, string> = {
  new: "New",
  needs_information: "Needs Info",
  ready_for_quote: "Ready to Quote",
  quote_sent: "Quote Sent",
  accepted: "Accepted",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  payment_pending: "Payment Due",
  paid: "Paid",
};

export const STATUS_COLOR: Record<JobStatus, string> = {
  new: "bg-gray-100 text-gray-600",
  needs_information: "bg-red-100 text-red-700",
  ready_for_quote: "bg-purple-100 text-purple-700",
  quote_sent: "bg-amber-100 text-amber-700",
  accepted: "bg-sky-100 text-sky-700",
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  payment_pending: "bg-orange-100 text-orange-700",
  paid: "bg-emerald-100 text-emerald-700",
};

export default function JobsPage() {
  const jobs = MOCK_JOBS; // swap: const jobs = await api.getJobs();

  return (
    <main className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <Link href="/jobs/new" className={buttonVariants({ size: "lg" }) + " gap-2"}>
          <Plus className="h-4 w-4" />
          New Job
        </Link>
      </div>

      {jobs.length === 0 && (
        <p className="text-center text-gray-500 py-12">
          No jobs yet. Tap <strong>New Job</strong> to get started.
        </p>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <Link key={job.id} href={`/jobs/${job.id}`} className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="space-y-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{job.title}</p>
                  <p className="text-sm text-gray-500">{job.customer.name}</p>
                  {job.quoted_amount !== null && (
                    <p className="text-sm font-medium text-gray-700">
                      ${job.quoted_amount.toLocaleString()}
                    </p>
                  )}
                  {job.missing_fields && job.missing_fields.length > 0 && (
                    <p className="text-xs text-red-600 font-medium">
                      Missing: {job.missing_fields.join(", ")}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[job.status]}`}
                >
                  {STATUS_LABEL[job.status]}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
