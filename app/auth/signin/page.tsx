"use client";

// ── Auth0 sign-in page ────────────────────────────────────────────────────────
// Clicking any button sends the user to /auth/login which Auth0 handles.
// The middleware redirects logged-in users away from this page automatically.

import Link from "next/link";

export default function SignInPage() {
  function handleSignIn() {
    // /auth/login is the Auth0 SDK route — it issues an HTTP 302 to Auth0's
    // servers, so window.location.href is required (router.push won't follow
    // external redirects correctly).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/auth/login?returnTo=/onboarding";
  }

  function handleGoogle() {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/auth/login?connection=google-oauth2&returnTo=/onboarding";
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900">
            <span className="text-2xl font-bold text-white">M</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Mano</h1>
          <p className="text-gray-500 text-sm">Welcome back</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

          <div className="px-8 pt-8 pb-6 space-y-1 text-center border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Sign in to your account</h2>
            <p className="text-sm text-gray-500">Secured by Auth0</p>
          </div>

          <div className="px-8 py-6 space-y-3">
            {/* Primary — Auth0 Universal Login (email + all social) */}
            <button
              onClick={handleSignIn}
              className="w-full rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Sign in with email
            </button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t border-gray-100" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 border-t border-gray-100" />
            </div>

            {/* Google shortcut */}
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-gray-400">
              Auth0 keeps your login secure.
              <br />We never store your password.
            </p>
          </div>
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="font-semibold text-gray-900 hover:underline">
            Sign up free
          </Link>
        </p>

      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" />
    </svg>
  );
}
