"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import AuthPanel from "./auth-panel";
import type { AuthUser } from "@/lib/api-schemas";

const ChargerMap = dynamic(() => import("./charger-map"), {
  ssr: false,
  loading: () => (
    <div className="glass-panel grid min-h-[620px] place-items-center rounded-[26px] text-sm text-zinc-400">
      Loading your local charging network…
    </div>
  ),
});

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);

  return (
    <main className="app-shell min-h-screen overflow-hidden bg-[#0B0D10] text-white">
      <div aria-hidden="true" className="ambient-orb ambient-orb-one" />
      <div aria-hidden="true" className="ambient-orb ambient-orb-two" />

      <header className="sticky top-0 z-[1400] px-4 pt-4 sm:px-7 sm:pt-5">
        <nav className="glass-nav mx-auto flex max-w-[1440px] items-center justify-between rounded-full px-4 py-2.5 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <span className="brand-mark grid size-9 place-items-center rounded-full bg-[#1ED760] text-zinc-950">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-5"
                fill="currentColor"
              >
                <path d="M11.16 1.7 4.7 10.1a.75.75 0 0 0 .6 1.2h4.02l-.48 6.99a.25.25 0 0 0 .45.17l6.03-8.8a.75.75 0 0 0-.62-1.17h-3.89l.8-6.57a.25.25 0 0 0-.45-.2Z" />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-extrabold tracking-tight text-white sm:text-base">
                charge<span className="text-lime-300">share</span>
              </span>
              <span className="hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:block">
                Bengaluru · local energy
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#finder"
              className="text-xs font-semibold text-zinc-400 transition hover:text-white"
            >
              Find a charger
            </Link>
            <Link
              href="#how-it-works"
              className="text-xs font-semibold text-zinc-400 transition hover:text-white"
            >
              How it works
            </Link>
          </div>

          <AuthPanel user={user} onUserChange={setUser} />
        </nav>
      </header>

      <section className="hero-section relative mx-auto grid min-h-[690px] w-full max-w-[1440px] items-center gap-10 px-6 pb-20 pt-16 sm:px-10 lg:min-h-[760px] lg:grid-cols-[1.08fr_0.92fr] lg:gap-6 lg:px-16 lg:pb-24 lg:pt-20">
        <div className="relative z-10">
          <div className="live-badge mb-7 inline-flex items-center gap-2.5 rounded-full border border-lime-300/15 bg-lime-300/[0.055] px-3.5 py-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#1ED760] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[#1ED760]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime-200">
              Bengaluru grid · fully charged
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 22 12"
              className="ml-1 h-3 w-[22px] text-[#A3FF12]"
              fill="none"
            >
              <rect x="1" y="1" width="17" height="10" rx="2" stroke="currentColor" />
              <path d="M20 4v4" stroke="currentColor" strokeWidth="2" />
              <path d="M4 4h3v4H4zM8 4h3v4H8zM12 4h3v4h-3z" fill="currentColor" />
            </svg>
          </div>

          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-500">
            Your next stop, powered by your neighbors
          </p>
          <h1 className="max-w-3xl text-[clamp(3.2rem,7.3vw,6.8rem)] font-black leading-[0.94] tracking-[-0.075em] text-white">
            Charge Anywhere.
            <br />
            <span className="hero-gradient-text">Power Everything.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
            The good-energy network for Bengaluru drivers. Find a home charger,
            book your moment, and get back to the fun part.
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            <div className="stat-pill">
              <span className="stat-pill-icon">04</span>
              4 home chargers live in Bengaluru
            </div>
            <div className="stat-pill">
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="size-4 text-lime-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M8 1.5 13 3.4v4.1c0 3.1-2.1 5.7-5 7-2.9-1.3-5-3.9-5-7V3.4l5-1.9Z" />
                <path d="m5.7 7.8 1.5 1.5 3.2-3.2" />
              </svg>
              Zero double-booking lock
            </div>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link href="#finder" className="primary-cta">
              Find Nearest Charger
              <span className="grid size-7 place-items-center rounded-full bg-black/10">
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
              </span>
            </Link>
            <span className="text-xs text-zinc-600">
              No range anxiety. Just good energy.
            </span>
          </div>
        </div>

        <div className="hero-art relative mx-auto flex min-h-[390px] w-full max-w-[560px] items-center justify-center lg:min-h-[530px]">
          <div className="hero-orbit hero-orbit-outer" />
          <div className="hero-orbit hero-orbit-inner" />
          <div className="hero-orbit-dot" />
          <div className="hero-energy-core">
            <div className="energy-grid" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-5 grid size-[68px] place-items-center rounded-[22px] border border-lime-200/20 bg-lime-300/10 text-[#A3FF12] shadow-[0_0_50px_rgba(163,255,18,0.12)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 32 32"
                  className="size-9"
                  fill="currentColor"
                >
                  <path d="M18.5 2.8 7.6 17a1.2 1.2 0 0 0 1 1.9h6.8l-.8 10.4a.4.4 0 0 0 .7.3L26.1 15a1.2 1.2 0 0 0-1-1.9h-6.6l1.3-9.9a.4.4 0 0 0-.7-.4Z" />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                Neighborhood energy
              </p>
              <p className="mt-2 text-4xl font-black tracking-[-0.06em] text-white">
                100<span className="text-lime-300">%</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">charged by community</p>
              <div className="mt-6 flex w-40 gap-1">
                {Array.from({ length: 10 }, (_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 flex-1 rounded-full ${
                      index < 8 ? "bg-[#1ED760]" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="hero-float-card hero-float-top">
            <span className="grid size-9 place-items-center rounded-xl bg-[#1ED760]/10 text-[#1ED760]">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M10 18s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" />
                <circle cx="10" cy="8" r="2" />
              </svg>
            </span>
            <span>
              <span className="block text-[10px] text-zinc-500">Plugging in near</span>
              <span className="mt-0.5 block text-xs font-bold text-white">
                Indiranagar, BLR
              </span>
            </span>
          </div>

          <div className="hero-float-card hero-float-bottom">
            <span className="relative grid size-8 place-items-center">
              <span className="absolute size-8 animate-ping rounded-full bg-blue-400/20" />
              <span className="relative size-3 rounded-full border-2 border-white bg-blue-400 shadow-[0_0_18px_#60A5FA]" />
            </span>
            <span>
              <span className="block text-xs font-bold text-white">
                Your EV, right here
              </span>
              <span className="mt-0.5 block text-[10px] text-zinc-500">
                Simulated location · 0.4 km
              </span>
            </span>
          </div>
        </div>
      </section>

      <section
        id="finder"
        className="finder-section relative mx-auto w-full max-w-[1440px] scroll-mt-24 px-4 pb-20 pt-10 sm:px-7 lg:px-12"
      >
        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-lime-300">
              The neighborhood grid
            </p>
            <h2 className="text-3xl font-black tracking-[-0.055em] text-white sm:text-4xl">
              Pick your next plug.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-zinc-500">
            Real homes, real power, and a little more range for the road ahead.
          </p>
        </div>

        <ChargerMap user={user} />
      </section>

      <section
        id="how-it-works"
        className="mx-auto grid w-full max-w-[1440px] gap-3 px-4 pb-20 sm:grid-cols-3 sm:px-7 lg:px-12"
      >
        {[
          ["01", "Find your frequency", "Filter local chargers by connector and distance."],
          ["02", "Lock in your charge", "Choose a session and get your exact pickup details."],
          ["03", "Plug in & power up", "Use your PIN to test the smart charger relay."],
        ].map(([number, title, description]) => (
          <article
            key={number}
            className="glass-panel rounded-2xl p-5 sm:p-6"
          >
            <p className="text-xs font-extrabold tracking-[0.18em] text-lime-300">
              / {number}
            </p>
            <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {description}
            </p>
          </article>
        ))}
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-7 text-center text-[11px] text-zinc-600">
        chargeShare Bengaluru <span className="px-2">·</span> Keep the city
        moving, one plug at a time.
      </footer>
    </main>
  );
}
