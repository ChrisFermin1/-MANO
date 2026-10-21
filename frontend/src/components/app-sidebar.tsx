"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, Briefcase, CalendarDays, FileText, Home, LogOut, Plus, Receipt, Settings, Users } from "lucide-react";
import { signOut } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

const ring = "outline-none focus-visible:ring-2 focus-visible:ring-forest";

// Desktop only (≥1024px): the phone keeps its own navigation. Hidden on Welcome, sign in, onboarding and the client link.
export function AppSidebar() {
  const { t } = useLang();
  const path = usePathname() ?? "/";
  const tab = useSearchParams()?.get("tab");
  if (path === "/" || path === "/entrar" || path.startsWith("/onboarding") || path.startsWith("/e/")) return null;

  const docs = path.startsWith("/documentos");
  const items = [
    { href: "/inicio", label: t.navHome, icon: Home, on: path.startsWith("/inicio") },
    { href: "/agenda", label: t.navAgenda, icon: CalendarDays, on: path.startsWith("/agenda") },
    { href: "/trabajos", label: t.navJobs, icon: Briefcase, on: path.startsWith("/trabajos") && !path.startsWith("/trabajos/nuevo") },
    { href: "/documentos?tab=estimates", label: t.navEstimates, icon: FileText, on: docs && tab !== "invoices" },
    { href: "/documentos?tab=invoices", label: t.navInvoices, icon: Receipt, on: docs && tab === "invoices" },
    { href: "/clientes", label: t.navClients, icon: Users, on: path.startsWith("/clientes") },
    { href: "/reportes", label: t.navReports, icon: BarChart3, on: path.startsWith("/reportes") },
  ];
  const item = (i: (typeof items)[number]) => (
    <Link
      key={i.href}
      href={i.href}
      aria-current={i.on ? "page" : undefined}
      className={`flex h-10 items-center gap-3 rounded-[12px] px-3 text-[15px] font-semibold transition ${ring} ${
        i.on ? "bg-sage text-forest" : "text-charcoal/70 hover:bg-black/5"
      }`}
    >
      <i.icon className="size-5 shrink-0" strokeWidth={2} />
      {i.label}
    </Link>
  );

  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-black/5 bg-white px-4 py-8 lg:flex">
      {/* top of the logo lines up with the top of each page's title (pages start 32px down too) */}
      <Link href="/inicio" className={`flex h-10 items-center self-start rounded-[8px] px-3 font-logo text-[28px] leading-none tracking-[-0.84px] text-forest ${ring}`}>
        mano
      </Link>
      <Link
        href="/trabajos/nuevo"
        className={`mt-6 flex h-10 items-center justify-center gap-2 rounded-[12px] bg-forest text-[15px] font-bold text-white transition hover:bg-forest/90 active:scale-[0.98] ${ring}`}
      >
        <Plus className="size-5" strokeWidth={2.75} />
        {t.newJob}
      </Link>
      <nav className="mt-6 space-y-1">{items.map(item)}</nav>
      <div className="mt-auto space-y-1 border-t border-black/5 pt-4">
        {item({ href: "/negocio", label: t.navBusiness, icon: Settings, on: path.startsWith("/negocio") })}
        <button
          type="button"
          onClick={signOut}
          className={`flex h-10 w-full items-center gap-3 rounded-[12px] px-3 text-[15px] font-semibold text-charcoal/50 transition hover:bg-black/5 hover:text-charcoal/80 ${ring}`}
        >
          <LogOut className="size-5 shrink-0" strokeWidth={2} />
          {t.signOut}
        </button>
      </div>
    </aside>
  );
}
