"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import AuthPanel from "./auth-panel";
import {
  authSessionResponseSchema,
  logoutResponseSchema,
  type AuthUser,
} from "@/lib/api-schemas";
import { parseApiResponse } from "@/lib/api-client";

const ChargerMap = dynamic(() => import("./charger-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-0 flex-1 place-items-center text-sm text-zinc-400">
      Loading the global station map…
    </div>
  ),
});

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await parseApiResponse(
          response,
          authSessionResponseSchema,
        );
        setUser(result.user);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSessionError(
          error instanceof Error ? error.message : "Unable to restore session.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoadingSession(false);
      }
    }

    void loadSession();
    return () => controller.abort();
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      await parseApiResponse(response, logoutResponseSchema);
      setUser(null);
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Unable to log out.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (isLoadingSession) {
    return (
      <main className="login-gateway min-h-svh bg-[#0B0D10] text-white">
        <div aria-hidden="true" className="gateway-grid" />
        <div aria-hidden="true" className="gateway-glow gateway-glow-top" />
        <div aria-hidden="true" className="gateway-glow gateway-glow-bottom" />
        <div className="relative z-10 grid min-h-svh place-items-center px-5">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span className="gateway-loading-mark grid size-9 place-items-center rounded-xl bg-[#1ED760] text-zinc-950">
              <span className="text-xl font-black">⚡</span>
            </span>
            Restoring your charge session…
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="login-gateway min-h-svh bg-[#0B0D10] px-4 py-10 text-white sm:px-6">
        <div aria-hidden="true" className="gateway-grid" />
        <div aria-hidden="true" className="gateway-glow gateway-glow-top" />
        <div aria-hidden="true" className="gateway-glow gateway-glow-bottom" />
        <div className="relative z-10 flex min-h-[calc(100svh-5rem)] flex-col items-center justify-center">
          <AuthPanel onAuthenticated={setUser} />
          <div className="mt-5 min-h-5 text-center">
            {sessionError && (
              <p className="text-xs text-zinc-500" role="status">
                {sessionError}
              </p>
            )}
          </div>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.17em] text-zinc-700">
            Local energy. Longer adventures.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell flex h-screen h-[100svh] flex-col overflow-hidden bg-[#0B0D10] text-white">
      <header className="relative z-[1400] flex h-[62px] flex-none items-center border-b border-white/[0.07] bg-[#0B0D10]/85 px-3 backdrop-blur-xl sm:px-5">
        <nav className="mx-auto flex w-full max-w-[1800px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="brand-mark grid size-8 place-items-center rounded-full bg-[#1ED760] text-zinc-950">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-4"
                fill="currentColor"
              >
                <path d="M11.16 1.7 4.7 10.1a.75.75 0 0 0 .6 1.2h4.02l-.48 6.99a.25.25 0 0 0 .45.17l6.03-8.8a.75.75 0 0 0-.62-1.17h-3.89l.8-6.57a.25.25 0 0 0-.45-.2Z" />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-extrabold tracking-tight text-white">
                charge<span className="text-lime-300">share</span>
              </span>
              <span className="hidden text-[9px] font-semibold uppercase tracking-[0.17em] text-zinc-500 sm:block">
                Pan-India live station finder
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="hidden max-w-36 truncate text-xs text-zinc-400 sm:inline">
              {user.name}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-bold text-zinc-200 transition hover:border-lime-300/30 hover:bg-lime-300/10 hover:text-lime-100 disabled:opacity-50"
            >
              {isLoggingOut ? "Signing out…" : "Log Out"}
            </button>
          </div>
        </nav>
      </header>
      {logoutError && (
        <p
          className="absolute right-4 top-[66px] z-[1500] rounded-xl border border-rose-300/20 bg-[#14181F] px-3 py-2 text-xs text-rose-300"
          role="alert"
        >
          {logoutError}
        </p>
      )}
      <div className="relative z-10 flex min-h-0 flex-1">
        <ChargerMap user={user} />
      </div>
    </main>
  );
}
