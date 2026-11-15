"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  authResponseSchema,
  authSessionResponseSchema,
  logoutResponseSchema,
  type AuthUser,
} from "@/lib/api-schemas";
import { parseApiResponse } from "@/lib/api-client";

type AuthPanelProps = {
  user: AuthUser | null;
  onUserChange: (user: AuthUser | null) => void;
};

type AuthMode = "login" | "register";

export default function AuthPanel({ user, onUserChange }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

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
        onUserChange(result.user);
      } catch (error) {
        if (controller.signal.aborted) return;
        setIsError(true);
        setMessage(
          error instanceof Error ? error.message : "Unable to load your session.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoadingSession(false);
      }
    }

    void loadSession();
    return () => controller.abort();
  }, [onUserChange]);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch(
        mode === "register" ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "register"
              ? { name, email, password }
              : { email, password },
          ),
        },
      );
      const result = await parseApiResponse(response, authResponseSchema);
      onUserChange(result.user);
      setPassword("");
      setIsOpen(false);
      setMessage(null);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      await parseApiResponse(response, logoutResponseSchema);
      onUserChange(null);
      setPassword("");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to log out.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {user ? (
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-2 pr-1">
          <span className="grid size-8 place-items-center rounded-full bg-lime-300 text-xs font-bold text-black">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden max-w-32 truncate text-sm text-zinc-200 sm:block">
            {user.name}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isSubmitting}
            className="rounded-full px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {isSubmitting ? "…" : "Log out"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setMessage(null);
            setIsError(false);
          }}
          disabled={isLoadingSession}
          className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300 px-4 py-2.5 text-sm font-bold text-zinc-950 shadow-[0_0_26px_rgba(163,255,18,0.12)] transition hover:bg-[#1ED760] disabled:opacity-60"
        >
          <span className="size-1.5 rounded-full bg-zinc-950" />
          {isLoadingSession ? "Checking…" : "Log in / Sign up"}
        </button>
      )}

      {message && (
        <span className="sr-only" role={isError ? "alert" : "status"}>
          {message}
        </span>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[2000] grid place-items-center bg-black/75 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            aria-labelledby="auth-dialog-title"
            aria-modal="true"
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#14181F] p-6 shadow-2xl shadow-black/60 sm:p-8"
            role="dialog"
          >
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">
                  Driver access
                </p>
                <h2
                  id="auth-dialog-title"
                  className="mt-2 text-2xl font-bold tracking-tight text-white"
                >
                  {mode === "register" ? "Join the charge." : "Welcome back."}
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Find a plug. Get moving.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close sign in dialog"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-full border border-white/10 bg-black/20 p-1">
              {(["login", "register"] as const).map((authMode) => (
                <button
                  key={authMode}
                  type="button"
                  onClick={() => {
                    setMode(authMode);
                    setMessage(null);
                    setIsError(false);
                  }}
                  aria-pressed={mode === authMode}
                  className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    mode === authMode
                      ? "bg-white text-zinc-950"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {authMode === "register" ? "Sign up" : "Log in"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <label className="block text-sm font-medium text-zinc-300">
                  Name
                  <input
                    required
                    autoComplete="name"
                    maxLength={80}
                    value={name}
                    onChange={(event) => setName(event.currentTarget.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-300/70"
                    placeholder="Your name"
                  />
                </label>
              )}
              <label className="block text-sm font-medium text-zinc-300">
                Email
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-300/70"
                  placeholder="you@example.com"
                />
              </label>
              <label className="block text-sm font-medium text-zinc-300">
                Password
                <input
                  required
                  type="password"
                  minLength={8}
                  maxLength={72}
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-300/70"
                  placeholder="At least 8 characters"
                />
              </label>

              {message && (
                <p
                  className={`text-sm ${isError ? "text-rose-300" : "text-lime-300"}`}
                  role={isError ? "alert" : "status"}
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#1ED760] px-4 py-3.5 text-sm font-extrabold text-zinc-950 shadow-[0_8px_32px_rgba(30,215,96,0.18)] transition hover:bg-[#A3FF12] disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting
                  ? "One sec…"
                  : mode === "register"
                    ? "Create driver account"
                    : "Log in"}
              </button>
            </form>

            <p className="mt-5 text-center text-xs leading-5 text-zinc-500">
              Your session stays private in a secure, HttpOnly cookie.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
