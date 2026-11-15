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
      setMessage(
        mode === "register" ? "Your driver account is ready." : "You are signed in.",
      );
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
      setMessage("You are signed out.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to log out.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Driver account"
      className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/70 p-5"
    >
      {isLoadingSession ? (
        <p className="text-sm text-zinc-400">Checking your account…</p>
      ) : user ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-white">Welcome, {user.name}</p>
            <p className="text-sm text-zinc-400">
              {user.email} · {user.role.toLowerCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isSubmitting}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
          >
            {isSubmitting ? "Signing out…" : "Log out"}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex gap-2">
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
                className={`rounded-full px-4 py-2 text-sm capitalize ${
                  mode === authMode
                    ? "bg-emerald-400 font-medium text-zinc-950"
                    : "text-zinc-300 hover:bg-white/5"
                }`}
              >
                {authMode === "register" ? "Sign up" : "Log in"}
              </button>
            ))}
          </div>
          <form
            onSubmit={handleSubmit}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {mode === "register" && (
              <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
                Name
                <input
                  required
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.currentTarget.value)}
                  className="rounded-lg border border-white/15 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-emerald-400"
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                className="rounded-lg border border-white/15 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-emerald-400"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
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
                className="rounded-lg border border-white/15 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-emerald-400"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="self-end rounded-lg bg-emerald-400 px-4 py-2.5 font-medium text-zinc-950 hover:bg-emerald-300 disabled:opacity-50"
            >
              {isSubmitting
                ? "Please wait…"
                : mode === "register"
                  ? "Create driver account"
                  : "Log in"}
            </button>
          </form>
        </>
      )}
      {message && (
        <p
          className={`mt-3 text-sm ${isError ? "text-red-300" : "text-emerald-300"}`}
          role={isError ? "alert" : "status"}
        >
          {message}
        </p>
      )}
    </section>
  );
}
