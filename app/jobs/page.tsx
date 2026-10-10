"use client";

import { useLanguage } from '@/context/LanguageContext';
import Link from "next/link";
import { Plus } from "lucide-react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Job, JobStatus } from "@/lib/types";

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
  const { t } = useLanguage();
  const { data: jobs, error, isLoading } = useSWR("/jobs", api.getJobs);

  return (
    <main className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('jobs')}</h1>
        <Link href="/jobs/new" className={buttonVariants({ size: "lg" }) + " gap-2"}>
          <Plus className="h-4 w-4" />
          {t('new_job')}
        </Link>
      </div>

      {isLoading && <p className="text-center text-gray-500 py-10">Loading jobs...</p>}
      
      {error && (
        <div className="text-center py-10 text-red-600 font-medium">
          Error loading jobs from server.
        </div>
      )}

      {jobs && jobs.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl">📋</p>
          <p className="font-semibold text-gray-700">No jobs yet</p>
          <p className="text-sm text-gray-500">
            Tap <strong>{t('new_job')}</strong> to add your first one.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {jobs?.map((job) => (
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
                    <p className="text-xs text-amber-600 font-medium">
                      Missing: {job.missing_fields.slice(0, 3).join(", ")}
                      {job.missing_fields.length > 3 ? ` +${job.missing_fields.length - 3}` : ""}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[job.status]}`}>
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
