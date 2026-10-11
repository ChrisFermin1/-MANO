"use client";

// DEMO-ONLY: keeps Carlos's app in sync with the relay on this Mac, so a phone on the same Wi-Fi can open and
// approve an estimate. Publishes his sent estimates, then checks every few seconds for approvals.
// Real backend version: poll GET /jobs (docs/BACKEND_HANDOFF.md §7) and delete this component.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getDemoJobs as getJobs, updateJob } from "@/lib/api";
import { loadBusiness } from "@/lib/business";
import { fetchEstimate, publishEstimate } from "@/lib/relay";

const EVERY_MS = 4000;

export function RelaySync() {
  const pathname = usePathname();
  const isCustomerPage = pathname.startsWith("/e/");

  useEffect(() => {
    if (isCustomerPage) return; // the customer's phone has no jobs of its own to sync
    let stop = false;

    const waiting = async () => (await getJobs()).filter((j) => j.status === "QUOTE_SENT" && j.public_token);

    // make sure every sent estimate is reachable from a phone (covers sample jobs and older sends)
    waiting().then((jobs) => jobs.forEach((j) => publishEstimate(j, loadBusiness())));

    const tick = async () => {
      for (const j of await waiting()) {
        const remote = await fetchEstimate(j.public_token!);
        // only accept an approval for THIS send of the estimate
        if (remote?.approved_at && remote.job.estimate_sent_at === j.estimate_sent_at) {
          await updateJob(j.id, { status: "ACCEPTED", approved_at: remote.approved_at, approved_by: remote.approved_by });
        }
      }
      if (!stop) timer = window.setTimeout(tick, EVERY_MS);
    };
    let timer = window.setTimeout(tick, EVERY_MS);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [isCustomerPage]);

  return null;
}
