// Accounts. FAKE for now: any 6-digit code works (except 000000, to test a wrong code), and Google / Apple
// sign you in right away. The session lives on this phone (localStorage), like the rest of the demo data.
//
// When the team picks the real login (a service like Clerk / Supabase / Firebase, or Josh's backend),
// ONLY this file changes: keep the same function names and return types, and the screens keep working.
// Never trust this fake session for anything real — it's not security, just the flow.

import { deleteAllFiles } from "@/lib/attachments";

export type AuthMethod = "phone" | "email" | "google" | "apple" | "demo";
export type Session = {
  userId: string;
  method: AuthMethod;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  createdAt: string;
};
/** Why a code didn't work: wrong, expired (10 min), or too many tries (5, then wait a minute). */
export type CodeError = "wrong" | "expired" | "locked";

const SESSION = "mano.session";
const PENDING = "mano.auth.pending"; // the code we "sent": who it's for, when, how many tries
const CODE_TTL = 10 * 60_000;
const MAX_TRIES = 5;
const LOCK_MS = 60_000;
export const RESEND_AFTER_S = 30; // "Mandar otro código" waits this long

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

/** Re-run when someone signs in or out (also from another tab). */
export function onAuthChange(fn: () => void): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => e.key === SESSION && fn();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

function start(method: AuthMethod, who: Partial<Session>): Session {
  const s: Session = { userId: Math.random().toString(36).slice(2, 10), method, createdAt: new Date().toISOString(), ...who };
  localStorage.setItem(SESSION, JSON.stringify(s));
  localStorage.removeItem(PENDING);
  emit();
  return s;
}

type Pending = { to: string; sentAt: number; tries: number; lockedUntil?: number };

/** Sends a 6-digit code by text (phone) or email. Real version: the login service sends it. */
export async function sendCode(to: string): Promise<void> {
  await wait(600);
  localStorage.setItem(PENDING, JSON.stringify({ to, sentAt: Date.now(), tries: 0 } satisfies Pending));
}

/** Checks the code. Fake: any 6 digits except 000000. */
export async function verifyCode(method: "phone" | "email", to: string, code: string): Promise<Session | CodeError> {
  await wait(500);
  const p = JSON.parse(localStorage.getItem(PENDING) ?? "null") as Pending | null;
  if (!p || p.to !== to || Date.now() - p.sentAt > CODE_TTL) return "expired";
  if (p.lockedUntil && Date.now() < p.lockedUntil) return "locked";
  if (!/^\d{6}$/.test(code) || code === "000000") {
    const tries = p.tries + 1;
    localStorage.setItem(PENDING, JSON.stringify({ ...p, tries, lockedUntil: tries >= MAX_TRIES ? Date.now() + LOCK_MS : undefined }));
    return tries >= MAX_TRIES ? "locked" : "wrong";
  }
  return start(method, method === "phone" ? { phone: to } : { email: to });
}

/** Google / Apple. Real version: opens their sign-in window and comes back. */
export async function signInWith(provider: "google" | "apple"): Promise<Session> {
  await wait(700);
  return start(provider, { email: provider === "google" ? "carlos@gmail.com" : "privado@privaterelay.appleid.com" });
}

/** "Ver un ejemplo": a throwaway account to look around with sample jobs. Stays in the real version too. */
export function signInDemo(): Session {
  return start("demo", { name: "Carlos" });
}

export function signOut() {
  localStorage.removeItem(SESSION);
  emit();
}

/** Deletes the account and everything Mano saved on this phone. Real version: the backend deletes it too. */
export function deleteAccount() {
  deleteAllFiles(); // job photos live in IndexedDB, not localStorage
  Object.keys(localStorage)
    .filter((k) => k.startsWith("mano.") && k !== "mano.lang")
    .forEach((k) => localStorage.removeItem(k));
  emit();
}
