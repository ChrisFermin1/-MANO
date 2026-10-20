"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Briefcase, FileText, Home, LogOut, Plus, Receipt, Settings, Users } from "lucide-react";
import { signOut } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

// Desktop only (≥1024px): the phone keeps its own navigation. Hidden on Welcome, sign in, onboarding and the client link.
export function AppSidebar() {
  const { t } = useLang();
  const path = usePathname() ?? "/";
  const tab = useSearchParams()?.get("tab");
  if (path === "/" || path === "/entrar" || path.startsWith("/onboarding") || path.startsWith("/e/")) return null;

  const docs = path.startsWith("/documentos");
  const items = [
    { href: "/inicio", label: t.navHome, icon: Home, on: path.startsWith("/inicio") },
    { href: "/trabajos", label: t.navJobs, icon: Briefcase, on: path.startsWith("/trabajos") && !path.startsWith("/trabajos/nuevo") },
    { href: "/documentos?tab=estimates", label: t.navEstimates, icon: FileText, on: docs && tab !== "invoices" },
    { href: "/documentos?tab=invoices", label: t.navInvoices, icon: Receipt, on: docs && tab === "invoices" },
    { href: "/clientes", label: t.navClients, icon: Users, on: path.startsWith("/clientes") },
  ];
  const item = (i: (typeof items)[number]) => (
    <Link
      key={i.href}
      href={i.href}
      aria-current={i.on ? "page" : undefined}
      className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px] font-semibold transition ${
        i.on ? "bg-sage text-forest" : "text-charcoal/70 hover:bg-black/5"
      }`}
    >
      <i.icon className="size-5 shrink-0" strokeWidth={2} />
      {i.label}
    </Link>
  );

  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-black/5 bg-white px-4 py-6 lg:flex">
      <Link href="/inicio" className="px-3 font-logo text-[28px] leading-none tracking-[-0.84px] text-forest">
        mano
      </Link>
      <Link
        href="/trabajos/nuevo"
        className="mt-6 flex h-11 items-center justify-center gap-2 rounded-[14px] bg-forest text-[15px] font-bold text-white transition active:scale-[0.98]"
      >
        <Plus className="size-5" strokeWidth={2.75} />
        {t.newJob}
      </Link>
      <nav className="mt-6 space-y-1">{items.map(item)}</nav>
      <div className="mt-auto">
        {item({ href: "/negocio", label: t.navBusiness, icon: Settings, on: path.startsWith("/negocio") })}
        <button
          type="button"
          onClick={signOut}
          className="mt-1 flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px] font-semibold text-charcoal/50 transition hover:bg-black/5 hover:text-charcoal/80"
        >
          <LogOut className="size-5 shrink-0" strokeWidth={2} />
          {t.signOut}
        </button>
      </div>
    </aside>
  );
}
