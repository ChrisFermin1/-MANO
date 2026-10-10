"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Alert } from "@/lib/types";

interface OjoSectionProps {
  alerts: Alert[];
}

const alertLabel: Record<Alert["kind"], string> = {
  quote_waiting: "Quote waiting for response",
  follow_up: "Follow up needed",
  payment_due: "Payment due",
  unread_message: "Unread message",
};

export default function OjoSection({ alerts }: OjoSectionProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-800">OJO</h2>
        </div>
        <p className="text-sm text-gray-500">
          All clear — nothing needs your attention right now.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Eye className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold text-gray-800">OJO</h2>
        <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-700">
          {visible.length} {visible.length === 1 ? "item needs" : "items need"} attention
        </span>
      </div>

      {/* Alert cards */}
      {visible.map((alert) => (
        <Card key={alert.id} className="border-l-4 border-l-amber-400 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <p className="font-semibold text-gray-900">{alert.job.customer.name}</p>
                <p className="text-sm text-gray-600">{alertLabel[alert.kind]}</p>
                <p className="text-xs text-gray-400">{alert.age_label} ago</p>
              </div>
              <Link
                href={`/jobs/${alert.job.id}`}
                className={buttonVariants({ size: "lg" }) + " shrink-0 gap-1"}
              >
                Review
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Dismiss
            </button>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
