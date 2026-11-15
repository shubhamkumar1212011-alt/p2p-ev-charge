"use client";

import { useState, type FormEvent } from "react";
import { authResponseSchema, type AuthUser } from "@/lib/api-schemas";
import { parseApiResponse } from "@/lib/api-client";

type AuthPanelProps = {
  onAuthenticated: (user: AuthUser) => void;
};

type AuthMode = "login" | "register";
type SignupRole = "DRIVER" | "HOST";

export default function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>("DRIVER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function setError(error: unknown) {
    setIsError(true);
    setMessage(error instanceof Error ? error.message : "Authentication failed.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);

    try {
      const requestBody =
        mode === "register"
          ? { name, email, password, role }
          : { email, password };
      const response = await fetch(
        mode === "register" ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        },
      );
      const result = await parseApiResponse(response, authResponseSchema);
      onAuthenticated(result.user);
    } catch (error) {
      setError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemoLogin() {
    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);

    try {
      const demoId = crypto.randomUUID();
      const demoPassword = `Demo-${crypto.randomUUID()}-A1!`;
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Demo Driver",
          email: `demo-${demoId}@example.test`,
          password: demoPassword,
          role: "DRIVER",
        }),
      });
      const result = await parseApiResponse(response, authResponseSchema);
      onAuthenticated(result.user);
    } catch (error) {
      setError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="gateway-title"
      className="auth-gateway-card relative w-full max-w-[460px] rounded-[30px] border border-white/10 bg-[#14181F]/90 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.65),0_0_70px_rgba(30,215,96,0.09)] backdrop-blur-xl sm:p-9"
    >
      <div className="absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-lime-300/70 to-transparent" />

      <div className="mb-7 text-center">
        <div className="gateway-brand-badge mx-auto mb-5 grid size-[62px] place-items-center rounded-[21px] border border-lime-200/20 bg-gradient-to-br from-[#1ED760]/20 to-lime-300/5 text-[#A3FF12]">
          <svg
            aria-hidden="true"
            viewBox="0 0 32 32"
            className="size-8"
            fill="currentColor"
          >
            <path d="M18.5 2.8 7.6 17a1.2 1.2 0 0 0 1 1.9h6.8l-.8 10.4a.4.4 0 0 0 .7.3L26.1 15a1.2 1.2 0 0 0-1-1.9h-6.6l1.3-9.9a.4.4 0 0 0-.7-.4Z" />
          </svg>
        </div>
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.23em] text-lime-300">
          ChargeShare Bengaluru
        </p>
        <h1
          id="gateway-title"
          className="text-[32px] font-black tracking-[-0.06em] text-white sm:text-[38px]"
        >
          Power Your Drive
        </h1>
        <p className="mx-auto mt-2 max-w-[330px] text-sm leading-6 text-zinc-400">
          Peer-to-peer neighborhood EV charging across Bengaluru.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 rounded-full border border-white/[0.08] bg-black/25 p-1">
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
            className={`rounded-full px-3 py-2.5 text-sm font-bold transition ${
              mode === authMode
                ? "bg-white text-[#0B0D10] shadow-lg"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {authMode === "register" ? "Create Account" : "Sign In"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {mode === "register" && (
          <>
            <label className="block text-xs font-semibold text-zinc-300">
              Your name
              <input
                required
                autoComplete="name"
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                placeholder="Alex Morgan"
                className="gateway-input mt-2 w-full rounded-xl border border-white/[0.09] bg-[#0B0D10]/70 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#1ED760]/60"
              />
            </label>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-zinc-300">
                I&apos;m joining as
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["DRIVER", "EV Driver"],
                    ["HOST", "Charger Host"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    aria-pressed={role === value}
                    className={`rounded-xl border px-3 py-3 text-xs font-bold transition ${
                      role === value
                        ? "border-[#1ED760]/45 bg-[#1ED760]/10 text-[#A3FF12]"
                        : "border-white/[0.08] bg-black/20 text-zinc-500 hover:text-zinc-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <label className="block text-xs font-semibold text-zinc-300">
          Email
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            placeholder="you@example.com"
            className="gateway-input mt-2 w-full rounded-xl border border-white/[0.09] bg-[#0B0D10]/70 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#1ED760]/60"
          />
        </label>

        <label className="block text-xs font-semibold text-zinc-300">
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
            placeholder="At least 8 characters"
            className="gateway-input mt-2 w-full rounded-xl border border-white/[0.09] bg-[#0B0D10]/70 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#1ED760]/60"
          />
        </label>

        {message && (
          <p
            className={`text-xs ${isError ? "text-rose-300" : "text-lime-300"}`}
            role={isError ? "alert" : "status"}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="gateway-submit flex w-full items-center justify-center gap-2 rounded-xl bg-[#1ED760] px-4 py-3.5 text-sm font-extrabold text-[#07110A] shadow-[0_8px_28px_rgba(30,215,96,0.18)] transition hover:bg-[#A3FF12] hover:shadow-[0_8px_38px_rgba(163,255,18,0.2)] disabled:cursor-wait disabled:opacity-55"
        >
          {isSubmitting
            ? "One sec…"
            : mode === "register"
              ? "Create Account"
              : "Sign In"}
          {!isSubmitting && (
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 10h12M10 4l6 6-6 6" />
            </svg>
          )}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
          or jump right in
        </span>
        <span className="h-px flex-1 bg-white/[0.08]" />
      </div>

      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.1] bg-white/[0.035] px-4 py-3 text-xs font-bold text-zinc-300 transition hover:border-lime-300/30 hover:bg-lime-300/[0.06] hover:text-lime-100 disabled:opacity-50"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="size-4 text-lime-300"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3M4.7 4.7l2.1 2.1m6.4 6.4 2.1 2.1m0-10.6-2.1 2.1m-6.4 6.4-2.1 2.1" />
          <circle cx="10" cy="10" r="3.1" />
        </svg>
        One-Click Demo Driver Login
      </button>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/[0.07] pt-5 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-[#1ED760]" />
          Protected by HttpOnly JWT
        </span>
        <span className="hidden text-zinc-700 sm:inline">•</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-lime-300" />
          Zero Double-Booking
        </span>
      </div>
    </section>
  );
}
