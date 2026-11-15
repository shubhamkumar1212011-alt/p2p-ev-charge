"use client";

import dynamic from "next/dynamic";
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
    <div className="fixed inset-0 grid place-items-center bg-[#0B0D10] text-sm text-zinc-400">
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
    <main className="fixed inset-0 h-screen h-[100svh] w-screen overflow-hidden bg-[#0B0D10] text-white">
      <ChargerMap
        user={user}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        logoutError={logoutError}
      />
    </main>
  );
}
