"use client";

import { useEffect, useRef, useState } from "react";
import AuthPanel from "./auth-panel";
import SupportChatbot from "@/components/support-chatbot";
import { createHeroScene, createGlobeScene } from "@/lib/chargeshare-scenes";
import type { AuthUser } from "@/lib/api-schemas";

type LandingShowcaseProps = {
  onAuthenticated: (user: AuthUser) => void;
  sessionError: string | null;
};

const PHOTO_CARDS = [
  {
    src: "/images/host-driveway.jpg",
    tag: "Verified Home Hosts",
    title: "Private driveways & gated society bays",
    desc: "Book a dedicated 7.4 kW Type 2 wallbox with zero public-queue waiting and 6-digit relay PIN access.",
    fallbackBg: "from-[#0b2447] to-[#17407c]",
  },
  {
    src: "/images/cafe-chill.jpg",
    tag: "Charge & Chill",
    title: "Real cafes & restrooms within 450m",
    desc: "Every station pin surfaces live walking-distance coffee shops, eateries, and washrooms via OpenStreetMap.",
    fallbackBg: "from-[#0f3d3e] to-[#196f63]",
  },
  {
    src: "/images/connector-guide.jpg",
    tag: "Host & Earn",
    title: "Turn idle parking into passive income",
    desc: "Set your own ₹/kWh rate, publish availability windows, and collect Razorpay-settled payouts.",
    fallbackBg: "from-[#1e293b] to-[#0f172a]",
  },
];

function PhotoCard({ card }: { card: (typeof PHOTO_CARDS)[number] }) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`relative h-52 w-full overflow-hidden bg-gradient-to-br ${card.fallbackBg}`}>
        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.src}
            alt={card.title}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col justify-between p-5 text-white">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur-xs">
              ⚡ {card.tag}
            </span>
            <p className="text-xs text-sky-100/90">
              Drop your photo at <code className="rounded bg-black/30 px-1.5 py-0.5 text-[11px]">public{card.src}</code>
            </p>
          </div>
        )}
      </div>
      <div className="p-5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#12965f]">{card.tag}</span>
        <h3 className="mt-1 text-lg font-bold text-slate-900">{card.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.desc}</p>
      </div>
    </article>
  );
}

export default function LandingShowcase({ onAuthenticated, sessionError }: LandingShowcaseProps) {
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const globeCanvasRef = useRef<HTMLCanvasElement>(null);
  const authSectionRef = useRef<HTMLDivElement>(null);
  const [cityQuery, setCityQuery] = useState("");

  useEffect(() => {
    if (!heroCanvasRef.current) return;
    const cleanup = createHeroScene(heroCanvasRef.current);
    return () => cleanup?.();
  }, []);

  useEffect(() => {
    if (!globeCanvasRef.current) return;
    const cleanup = createGlobeScene(globeCanvasRef.current);
    return () => cleanup?.();
  }, []);

  const scrollToAuth = (prefill?: string) => {
    if (prefill) setCityQuery(prefill);
    authSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      {/* Top announcement bar */}
      <div className="bg-[#071a36] text-sky-100 text-xs border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <span>⚡ India&apos;s peer-to-peer EV charging network · Live map &amp; PIN relay</span>
          <div className="hidden sm:flex items-center gap-5">
            <button type="button" onClick={() => scrollToAuth()} className="hover:text-white">
              List your charger
            </button>
            <button type="button" onClick={() => scrollToAuth()} className="hover:text-white">
              Sign in / Map
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#19c37d] text-[#0b2447] font-black shadow-xs">
              ⚡
            </div>
            <span className="text-xl font-extrabold tracking-tight text-[#0b2447]">
              Charge<span className="text-[#19c37d]">Share</span>
            </span>
          </div>
          <nav className="flex items-center gap-3 sm:gap-6 text-sm font-semibold text-slate-700">
            <a href="#stations" className="hidden md:inline hover:text-[#0b2447]">
              How it works
            </a>
            <a href="#network" className="hidden md:inline hover:text-[#0b2447]">
              Corridors
            </a>
            <button
              type="button"
              onClick={() => scrollToAuth()}
              className="rounded-full bg-[#0b2447] px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-[#14376b] transition"
            >
              Open Live Map →
            </button>
          </nav>
        </div>
      </header>

      {/* Navy Hero + 3D EV Car & Charger Canvas */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: "radial-gradient(1100px 560px at 75% 30%, #17407c 0%, #0b2447 55%, #071a36 100%)" }}
      >
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 py-12 lg:grid-cols-12 lg:py-16">
          <div className="lg:col-span-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-sky-100">
              <span className="h-2 w-2 rounded-full bg-[#19c37d]" /> Verified P2P Wallboxes &amp; Rapid Hubs
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl leading-[1.12]">
              Find &amp; share <span className="text-[#19c37d]">EV chargers</span> in your neighborhood.
            </h1>
            <p className="mt-4 max-w-xl text-base sm:text-lg text-sky-100/90 leading-relaxed">
              Skip crowded highway queues. Book a verified residential or workplace charger nearby, unlock with a 6-digit relay PIN, and relax at cafes within walking distance.
            </p>

            {/* Pill Search Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                scrollToAuth();
              }}
              className="mt-7 flex max-w-lg items-center gap-2 rounded-full bg-white p-1.5 shadow-2xl"
            >
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder="Search Bengaluru, JP Nagar, Jaipur, Pune..."
                className="flex-1 bg-transparent px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-[#19c37d] px-5 py-2.5 text-sm font-extrabold text-[#0b2447] hover:bg-[#15ab6d] transition"
              >
                Find Chargers
              </button>
            </form>

            {/* Quick City Pills */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-sky-200/80">Popular hubs:</span>
              {["Bengaluru · Indiranagar", "Bengaluru · JP Nagar", "Jaipur · Vaishali Nagar", "Pune · Baner"].map((spot) => (
                <button
                  key={spot}
                  type="button"
                  onClick={() => scrollToAuth(spot)}
                  className="rounded-full border border-white/25 px-3 py-1 text-sky-100 hover:bg-white/15 transition"
                >
                  {spot}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive 3D EV Car + Charging Post */}
          <div className="relative h-[380px] sm:h-[460px] lg:col-span-6 rounded-3xl border border-white/15 bg-[#071a36]/50 shadow-2xl">
            <canvas ref={heroCanvasRef} className="block h-full w-full rounded-3xl" />
            <div className="pointer-events-none absolute top-4 left-4 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs backdrop-blur-md">
              <span className="text-sky-200">Live Telemetry</span>
              <b className="block text-sm text-white">7.4 kW · Type 2 AC</b>
            </div>
            <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs backdrop-blur-md">
              <span className="text-sky-200">Interactive 3D</span>
              <b className="block text-sm text-[#19c37d]">Drag to rotate vehicle</b>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Photo Gallery Section (Custom Image Slots) */}
      <section id="stations" className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-widest text-[#12965f]">Built for Indian EV Drivers</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Real chargers, real hosts, zero guesswork
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Every listing displays exact kW output, connector schematic, verified host utilities, and live OpenStreetMap cafes nearby.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PHOTO_CARDS.map((card) => (
            <PhotoCard key={card.title} card={card} />
          ))}
        </div>
      </section>

      {/* 3D India Corridor Globe + Sign-in / Live Map Portal */}
      <section id="network" ref={authSectionRef} className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#12965f]">Growing Across India</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              Connected charging across major metros
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Sign in to explore live pins across Bengaluru, Jaipur, Mumbai, Delhi NCR, Hyderabad, and Pune—or publish your own home charger in 60 seconds.
            </p>
            <div className="relative mt-6 h-[320px] w-full overflow-hidden rounded-3xl bg-[#071a36] shadow-lg">
              <canvas ref={globeCanvasRef} className="block h-full w-full" />
              <div className="pointer-events-none absolute bottom-3 left-4 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] text-sky-100 backdrop-blur-xs">
                Drag globe · Live P2P mesh
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-slate-200 bg-[#f8fafc] p-6 sm:p-8 shadow-sm">
              {cityQuery && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-900">
                  Selected area: <b>{cityQuery}</b> — Sign in below to view available chargers on the live map.
                </div>
              )}
              <AuthPanel onAuthenticated={onAuthenticated} />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-[#071a36] py-10 text-xs text-sky-200/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#19c37d] text-[#0b2447]">⚡</span>
            ChargeShare
          </div>
          <p>© {new Date().getFullYear()} ChargeShare · Peer-to-Peer EV Charging Network</p>
        </div>
      </footer>

      {/* Floating Support Chatbot */}
      <SupportChatbot />
    </div>
  );
}
