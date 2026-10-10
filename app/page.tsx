import Link from "next/link";
import OjoSection from "@/components/OjoSection";
import NextActionCard from "@/components/NextActionCard";
import ActiveJobsBar from "@/components/ActiveJobsBar";
import type { DashboardData } from "@/lib/types";

// ── Mock data — replace with `api.getDashboard()` once the backend is ready ──
const MOCK: DashboardData = {
  contractor_name: "Carlos",
  alerts: [
    {
      id: "a1",
      kind: "quote_waiting",
      age_label: "3 days",
      message: "Quote waiting for response",
      job: {
        id: "j1",
        title: "Bathroom tile repair",
        description: "Fix cracked tiles in main bathroom.",
        status: "quote_sent",
        quoted_amount: 350,
        quote_text: null,
        missing_fields: null,
        created_at: "2024-01-10T10:00:00Z",
        updated_at: "2024-01-13T14:00:00Z",
        customer: {
          id: "c1",
          name: "Maria Rodriguez",
          phone: "+1 555 0101",
          preferred_language: "es",
        },
      },
    },
    {
      id: "a2",
      kind: "follow_up",
      age_label: "1 day",
      message: "Follow up on accepted quote",
      job: {
        id: "j2",
        title: "Interior painting — 3 rooms",
        description: "Paint living room, kitchen, hallway.",
        status: "accepted",
        quoted_amount: 1200,
        quote_text: null,
        missing_fields: null,
        created_at: "2024-01-08T09:00:00Z",
        updated_at: "2024-01-12T11:00:00Z",
        customer: {
          id: "c2",
          name: "Tom Nguyen",
          phone: "+1 555 0202",
          preferred_language: "en",
        },
      },
    },
  ],
  next_action: {
    label: "Follow up with Maria on the bathroom tile quote",
    job_id: "j1",
  },
  active_job_count: 5,
};

export default function DashboardPage() {
  const data = MOCK; // swap: const data = await api.getDashboard();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <main className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-8">
      {/* Greeting */}
      <header>
        <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-1">
          Mano
        </p>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {data.contractor_name} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          You have{" "}
          <Link href="/jobs" className="font-semibold text-gray-700 underline underline-offset-2">
            {data.active_job_count} active job{data.active_job_count !== 1 ? "s" : ""}
          </Link>
          .
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
