"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { resetJobs } from "@/lib/api";
import { getSession, onAuthChange, signInDemo } from "@/lib/auth";
import { DEMO_BUSINESS, loadBusiness, saveBusiness } from "@/lib/business";
import { needsImport, skippedThisVisit } from "@/lib/import";

// Open to everyone: Welcome, sign in, and the page a client opens from a link. Everything else needs a session.
const isPublic = (path: string) => path === "/" || path === "/entrar" || path.startsWith("/e/");

/** Where a signed-in person belongs: their Inicio, or onboarding if they never finished setting up the business. */
export const homeFor = () => (loadBusiness()?.businessName ? "/inicio" : "/onboarding/oficio");

/** Right after signing in: first offer to move this phone's data to the account (when the server holds data),
 *  otherwise Inicio / onboarding. */
export async function afterSignIn(): Promise<string> {
  return (await needsImport()) && !skippedThisVisit() ? "/importar" : homeFor();
}

/** "Ver un ejemplo": a sample business with sample jobs, signed into a throwaway demo account. */
export function startDemo() {
  if (!loadBusiness()?.businessName) saveBusiness(DEMO_BUSINESS);
  resetJobs({ demo: true });
  signInDemo();
}

// Signed out on an app page → sign in. Signed in on Welcome or sign in → straight into the app
// (so the saved Home Screen app opens on Inicio, not the landing page).
export function AuthGate({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  const router = useRouter();
  // null = not checked yet (server render). "left" = signed out or deleted the account during this visit:
  // that goes back to Welcome, while opening an app page signed out goes to sign in.
  const [state, setState] = useState<null | "in" | "out" | "left">(null);

  useEffect(() => {
    const check = () => setState((was) => (getSession() ? "in" : was === "in" || was === "left" ? "left" : "out"));
    check();
    return onAuthChange(check);
  }, []);

  const open = isPublic(path);
  const leave =
    state === "out" && !open ? "/entrar" : state === "left" && !open ? "/" : state === "in" && (path === "/" || path === "/entrar") ? homeFor() : null;

  useEffect(() => {
    if (!leave) return;
    // signed in on Welcome / sign in: maybe the import screen first
    if (state === "in") void afterSignIn().then((to) => router.replace(to));
    else router.replace(leave);
  }, [leave, state, router]);

  // public pages render right away (no flash on Welcome); app pages wait for the check
  if (open && !leave) return <>{children}</>;
  if (state === null || leave) return null;
  return <>{children}</>;
}
