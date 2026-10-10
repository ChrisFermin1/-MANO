"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0/client";
import OjoSection from "@/components/OjoSection";
import NextActionCard from "@/components/NextActionCard";
import ActiveJobsBar from "@/components/ActiveJobsBar";
import { getJobs, getActiveJobCount, deriveAlerts, deriveNextAction } from "@/lib/storage";
import type { DashboardData } from "@/lib/types";

export default function DashboardPage() {
  // Read jobs from localStorage — lazy initializer runs once on mount
  // TODO: replace with api.getDashboard() once backend is ready
  const [data] = useState<DashboardData>(() => {
    if (typeof window === "undefined") {
      return { contractor_name: "there", alerts: [], next_action: null, active_job_count: 0 };
    }
    const jobs = getJobs();
    return {
      contractor_name: "there", // overridden below from Auth0
      alerts: deriveAlerts(jobs),
      next_action: deriveNextAction(jobs),
      active_job_count: getActiveJobCount(),
    };
  });

  const { user } = useUser();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  // Move time-dependent value into state so it isn't evaluated during prerender
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  });

  return (
    <main className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-8">
      {/* Greeting */}
      <header>
        <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-1">
          Mano
        </p>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {data.active_job_count > 0 ? (
            <>
              You have{" "}
              <Link href="/jobs" className="font-semibold text-gray-700 underline underline-offset-2">
                {data.active_job_count} active job{data.active_job_count !== 1 ? "s" : ""}
              </Link>
              .
            </>
          ) : (
            <>
              No jobs yet.{" "}
              <Link href="/jobs/new" className="font-semibold text-gray-700 underline underline-offset-2">
                Create your first job →
              </Link>
            </>
          )}
        </p>
      </header>

      <hr className="border-gray-200" />

      {/* OJO — attention items */}
      <OjoSection alerts={data.alerts} />

      {data.alerts.length > 0 && <hr className="border-gray-200" />}

      {/* Next action */}
      {data.next_action && <NextActionCard action={data.next_action} />}
      {data.next_action && <hr className="border-gray-200" />}

      {/* Active jobs summary */}
      <ActiveJobsBar count={data.active_job_count} />

      <hr className="border-gray-200" />

      {/* Quote Builder CTA */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Quote Builder</h2>
        <Link
          href="/quote-builder"
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <div className="space-y-0.5">
            <p className="font-semibold text-gray-900">Build a quote with AI</p>
            <p className="text-sm text-gray-500">Describe the job — get 3 options in seconds</p>
          </div>
          <span className="text-purple-600 text-xl">✨</span>
        </Link>
      </section>
    </main>
  );
}
