"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import { LogOut } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";

const HIDE_ON = ["/auth/", "/onboarding"];

export default function UserHeader() {
  const pathname = usePathname();
  const { user, isLoading } = useUser();

  const hidden = HIDE_ON.some((p) => pathname.startsWith(p));
  if (hidden || isLoading || !user) return null;

  const initials = user.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2.5">
        <Link href="/" className="text-sm font-bold text-gray-900 tracking-tight">
          Mano
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {user.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture}
              alt={user.name ?? "User"}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white text-xs font-bold">
              {initials}
            </div>
          )}
          <span className="text-sm text-gray-700 hidden sm:block">
            {user.name?.split(" ")[0]}
          </span>

          {/* Auth0 logout — /auth/logout is handled by the SDK route */}
          <a
            href="/auth/logout"
            className="ml-1 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Sign out</span>
          </a>
        </div>
      </div>
    </header>
  );
}
