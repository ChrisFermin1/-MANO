import { Briefcase, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

interface ActiveJobsBarProps {
  count: number;
}

export default function ActiveJobsBar({ count }: ActiveJobsBarProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Active Jobs</h2>
        <span className="rounded-full bg-blue-100 px-3 py-0.5 text-lg font-bold text-blue-700">
          {count}
        </span>
      </div>

      <div className="flex gap-3">
        <Link
          href="/jobs"
          className={buttonVariants({ size: "lg", variant: "outline" }) + " flex-1 gap-2 text-base"}
        >
          <Briefcase className="h-4 w-4" />
          View Jobs
        </Link>
        <Link
          href="/jobs/new"
          className={buttonVariants({ size: "lg" }) + " flex-1 gap-2 text-base"}
        >
          <Plus className="h-4 w-4" />
          New Job
        </Link>
      </div>
    </section>
  );
}
