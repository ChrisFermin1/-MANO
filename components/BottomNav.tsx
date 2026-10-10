"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, Plus, FileText } from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  highlight?: boolean;
}

const NAV: NavItem[] = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/jobs", icon: Briefcase, label: "Jobs" },
  { href: "/jobs/new", icon: Plus, label: "New Job", highlight: true },
  { href: "/quote-builder", icon: FileText, label: "Quote" },
];

// Pages where the bottom nav should not appear
const HIDE_ON = ["/auth/", "/onboarding"];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white z-50">
      <div className="mx-auto max-w-lg flex items-stretch">
        {NAV.map(({ href, icon: Icon, label, highlight }) => {
          // Exact match for "/" and "/jobs/new"; prefix match for others except when a
          // more-specific path is already handled (e.g. /jobs/new shouldn't activate /jobs)
          const active =
            href === "/"
              ? pathname === "/"
              : href === "/jobs/new"
              ? pathname === "/jobs/new" || pathname.startsWith("/jobs/new/")
              : href === "/jobs"
              ? pathname === "/jobs" || (pathname.startsWith("/jobs/") && !pathname.startsWith("/jobs/new"))
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                highlight
                  ? "text-white bg-gray-900 rounded-t-lg mx-2"
                  : active
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
