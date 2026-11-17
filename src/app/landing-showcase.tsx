"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthPanel from "./auth-panel";
import SupportChatbot from "@/components/support-chatbot";
import { createHeroScene, createGlobeScene, createConnectorScene } from "@/lib/chargeshare-scenes";
import type { AuthUser } from "@/lib/api-schemas";

type LandingShowcaseProps = {
  onAuthenticated: (user: AuthUser) => void;
  sessionError: string | null;
};

const INDIAN_EVS = [
  { id: "nexon", name: "Tata Nexon.ev LR", batteryKwh: 40.5, maxAcKw: 7.2, connector: "Type 2" },
  { id: "zs", name: "MG ZS EV", batteryKwh: 50.3, maxAcKw: 7.4, connector: "Type 2" },
  { id: "tiago", name: "Tata Tiago.ev LR", batteryKwh: 24.0, maxAcKw: 7.2, connector: "Type 2" },
  { id: "xuv400", name: "Mahindra XUV400 EL", batteryKwh: 39.4, maxAcKw: 7.2, connector: "Type 2" },
  { id: "atto3", name: "BYD Atto 3", batteryKwh: 60.5, maxAcKw: 7.4, connector: "Type 2" },
  { id: "punch", name: "Tata Punch.ev LR", batteryKwh: 35.0, maxAcKw: 7.2, connector: "Type 2" },
];

const FEATURED_STATIONS = [
  {
    id: "blr-indiranagar",
    title: "12th Main Villa Wallbox",
    locality: "Indiranagar, Bengaluru",
    powerKw: 7.4,
    connector: "Type 2",
    pricePerHour: 135,
    rating: "4.9",
    sessions: 142,
    badges: ["MCB & Earthing Verified", "Covered Driveway", "Cafe 120m"],
  },
  {
    id: "blr-jpnagar",
    title: "JP Nagar 6th Phase Residency",
    locality: "JP Nagar, Bengaluru",
    powerKw: 7.4,
    connector: "Type 2",
    pricePerHour: 120,
    rating: "4.8",
    sessions: 98,
    badges: ["24x7 Security", "Washroom Access", "PIN Relay"],
  },
  {
    id: "jpr-vaishali",
    title: "Vaishali Nagar Solar Carport",
    locality: "Vaishali Nagar, Jaipur",
    powerKw: 22.0,
    connector: "Type 2",
    pricePerHour: 290,
    rating: "5.0",
    sessions: 64,
    badges: ["Solar-Backed", "Covered Bay", "Lounge & Wi-Fi"],
  },
  {
    id: "pun-baner",
    title: "Baner High Street Fast Bay",
    locality: "Baner, Pune",
    powerKw: 30.0,
    connector: "CCS2",
    pricePerHour: 480,
    rating: "4.9",
    sessions: 215,
    badges: ["DC Rapid", "BIS Certified", "24x7 Open"],
  },
];

const PHOTO_CARDS = [
  {
    src: "/images/host-driveway.jpg",
    tag: "Residential Hosts",
    title: "Verified home driveways & society bays",
    desc: "Reserve a dedicated wallbox ahead of time and unlock power with your 6-digit relay PIN—no public queue delays.",
  },
  {
    src: "/images/cafe-chill.jpg",
    tag: "Charge & Chill",
    title: "Curated cafes & restrooms within 450m",
    desc: "Every station pin surfaces real walking-distance coffee spots, eateries, and washrooms via OpenStreetMap.",
  },
  {
    src: "/images/connector-guide.jpg",
    tag: "Host Economics",
    title: "Monetize idle parking safely",
    desc: "Set custom ₹/hour tariffs, control availability hours, and receive automated Razorpay settlements.",
  },
];

function BoltMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13 2L4 14h6.5L9 22l11-12h-6.5L13 2z" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

function PhotoCard({ card }: { card: (typeof PHOTO_CARDS)[number] }) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#0b2447] via-[#12366b] to-[#081a34]">
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
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-[#19c37d]" /> {card.tag}
            </span>
            <div className="space-y-1">
              <p className="text-xs font-medium text-sky-100">Custom Photo Slot Ready</p>
              <p className="text-[11px] text-sky-200/80">
                Add <code className="rounded bg-black/30 px-1.5 py-0.5">public{card.src}</code> to display your own photo
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="p-5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#12965f]">{card.tag}</span>
        <h3 className="mt-1 text-base font-bold text-slate-900">{card.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.desc}</p>
      </div>
    </article>
  );
}

export default function LandingShowcase({ onAuthenticated, sessionError }: LandingShowcaseProps) {
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const globeCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectorCanvasRef = useRef<HTMLCanvasElement>(null);
  const authSectionRef = useRef<HTMLDivElement>(null);

  const [cityQuery, setCityQuery] = useState("");
  const [selectedEvId, setSelectedEvId] = useState("nexon");
  const [inspectSpec, setInspectSpec] = useState<{ powerKw: number; connector: string }>({
    powerKw: 7.4,
    connector: "Type 2",
  });

  const selectedEv = INDIAN_EVS.find((ev) => ev.id === selectedEvId) || INDIAN_EVS[0];

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

  useEffect(() => {
    if (!connectorCanvasRef.current) return;
    const cleanup = createConnectorScene(connectorCanvasRef.current, inspectSpec);
    return () => cleanup?.();
  }, [inspectSpec]);

  const scrollToAuth = (prefill?: string) => {
    if (prefill) setCityQuery(prefill);
    authSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  function calcChargeEstimate(stationKw: number, pricePerHour: number) {
    const neededKwh = selectedEv.batteryKwh * 0.6; // 20% -> 80%
    const effectiveKw = stationKw >= 25 ? Math.min(stationKw, 30) : Math.min(stationKw, selectedEv.maxAcKw);
    const hours = neededKwh / effectiveKw;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    const estInr = Math.max(50, Math.round(hours * pricePerHour));
    return {
      timeLabel: h > 0 ? `${h}h ${m}m` : `${m} mins`,
      estInr,
    };
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Top Compliance & Network Bar */}
      <div className="bg-[#071a36] text-sky-100 text-xs border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#19c37d]" />
            Peer-to-Peer EV Charging Marketplace · UPI &amp; Card Escrow via Razorpay
          </span>
          <div className="hidden sm:flex items-center gap-5">
            <Link href="/safety" className="hover:text-white">
              Safety Standards
            </Link>
            <button type="button" onClick={() => scrollToAuth()} className="hover:text-white">
              Host a Charger
            </button>
            <button type="button" onClick={() => scrollToAuth()} className="hover:text-white">
              Driver Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b2447] text-[#19c37d] shadow-xs">
              <BoltMark className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-[#0b2447]">
                Charge<span className="text-[#12965f]">Share</span>
              </span>
            </div>
          </div>
          <nav className="flex items-center gap-4 sm:gap-6 text-sm font-semibold text-slate-700">
            <a href="#live-stations" className="hidden md:inline hover:text-[#0b2447]">
              Stations &amp; Tariffs
            </a>
            <a href="#connector-lab" className="hidden md:inline hover:text-[#0b2447]">
              Connector Guide
            </a>
            <Link href="/safety" className="hidden sm:inline hover:text-[#0b2447]">
              Trust &amp; Safety
            </Link>
            <button
              type="button"
              onClick={() => scrollToAuth()}
              className="rounded-full bg-[#0b2447] px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-[#14376b] transition"
            >
              Launch Live Map
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
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-sky-100">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-[#19c37d]" />
              <span>MCB-Verified Residential &amp; Commercial Chargers</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl leading-[1.14]">
              Reserve verified <span className="text-[#19c37d]">EV chargers</span> in your neighborhood.
            </h1>
            <p className="mt-4 max-w-xl text-sm sm:text-base text-sky-100/90 leading-relaxed">
              Book private Type 2 wallboxes and rapid CCS2 bays by the hour. Pay securely via UPI or card, unlock power with a 6-digit relay PIN, and get automatic refunds if a slot is unavailable.
            </p>

            {/* Search + Vehicle Selector Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                scrollToAuth();
              }}
              className="mt-7 flex flex-col sm:flex-row max-w-xl items-stretch sm:items-center gap-2 rounded-2xl sm:rounded-full bg-white p-2 shadow-2xl"
            >
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder="Enter locality (Indiranagar, JP Nagar, Jaipur...)"
                className="flex-1 bg-transparent px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl sm:rounded-full bg-[#19c37d] px-5 py-2.5 text-sm font-extrabold text-[#0b2447] hover:bg-[#15ab6d] transition whitespace-nowrap"
              >
                Check Availability
              </button>
            </form>

            {/* Trust Metrics Strip */}
            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/15 pt-5 max-w-lg text-xs">
              <div>
                <p className="text-lg font-extrabold text-white">0% Sub Fee</p>
                <p className="text-sky-200/80">Pay strictly per session</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-[#19c37d]">6-Digit PIN</p>
                <p className="text-sky-200/80">Hardware relay unlock</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-white">100% Refund</p>
                <p className="text-sky-200/80">If bay is inaccessible</p>
              </div>
            </div>
          </div>

          {/* Interactive 3D EV Car + Charging Post */}
          <div className="relative h-[380px] sm:h-[450px] lg:col-span-6 rounded-3xl border border-white/15 bg-[#071a36]/50 shadow-2xl">
            <canvas ref={heroCanvasRef} className="block h-full w-full rounded-3xl" />
            <div className="pointer-events-none absolute top-4 left-4 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs backdrop-blur-md">
              <span className="text-sky-200">Active Session Preview</span>
              <b className="block text-sm text-white">7.4 kW · Type 2 AC</b>
            </div>
            <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs backdrop-blur-md">
              <span className="text-sky-200">3D Inspection</span>
              <b className="block text-sm text-[#19c37d]">Drag to rotate vehicle</b>
            </div>
          </div>
        </div>
      </section>

      {/* Public Live Stations Preview + Indian EV Calculator */}
      <section id="live-stations" className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#12965f]">Transparent Tariffs</p>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Featured Chargers &amp; EV Time Estimator
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Select your EV model to preview realistic 20% to 80% charging duration and estimated session cost.
            </p>
          </div>

          {/* Vehicle Picker */}
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs">
            <label htmlFor="ev-model" className="text-xs font-bold text-slate-500 whitespace-nowrap">
              Your EV:
            </label>
            <select
              id="ev-model"
              value={selectedEvId}
              onChange={(e) => setSelectedEvId(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-[#0b2447] focus:outline-none"
            >
              {INDIAN_EVS.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.batteryKwh} kWh)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_STATIONS.map((st) => {
            const est = calcChargeEstimate(st.powerKw, st.pricePerHour);
            return (
              <div
                key={st.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-[#19c37d] hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-[#0b2447] px-2.5 py-1 text-[11px] font-bold text-white">
                      {st.powerKw} kW · {st.connector}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {st.rating} ({st.sessions})
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-slate-900">{st.title}</h3>
                  <p className="text-xs text-slate-500">{st.locality}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {st.badges.map((b) => (
                      <span
                        key={b}
                        className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-3.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-extrabold text-slate-900">₹{st.pricePerHour}/hr</span>
                    <span className="text-[11px] font-semibold text-[#12965f]">
                      20→80%: {est.timeLabel} (~₹{est.estInr})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => scrollToAuth(st.locality)}
                    className="mt-3 w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-[#0b2447] transition"
                  >
                    Book This Bay
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3D Connector Pin-Layout Inspector + Photo Cards */}
      <section id="connector-lab" className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-extrabold uppercase tracking-widest text-[#12965f]">Hardware Compatibility</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Inspect Indian EV Connector Pinouts in 3D
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Verify plug geometry and power ratings before booking. Switch connector standards below to inspect pin configuration and energy flow rate.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { label: "Type 2 (7.4 kW AC)", powerKw: 7.4, connector: "Type 2" },
                  { label: "CCS2 (60 kW DC)", powerKw: 60, connector: "CCS2" },
                  { label: "CHAdeMO (50 kW DC)", powerKw: 50, connector: "CHAdeMO" },
                  { label: "15A Socket (3.3 kW)", powerKw: 3.3, connector: "15A Socket" },
                ].map((opt) => {
                  const active = inspectSpec.connector === opt.connector;
                  return (
                    <button
                      key={opt.connector}
                      type="button"
                      onClick={() => setInspectSpec({ powerKw: opt.powerKw, connector: opt.connector })}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        active
                          ? "bg-[#0b2447] text-white"
                          : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative h-[320px] lg:col-span-7 overflow-hidden rounded-3xl bg-[#071a36] shadow-lg">
              <canvas ref={connectorCanvasRef} className="block h-full w-full" />
              <div className="pointer-events-none absolute bottom-3 left-4 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] text-sky-100 backdrop-blur-xs">
                {inspectSpec.connector} · {inspectSpec.powerKw} kW · Drag to inspect pins
              </div>
            </div>
          </div>

          {/* 3 Station & Host Photo Cards */}
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PHOTO_CARDS.map((card) => (
              <PhotoCard key={card.title} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* 3D India Corridor Globe + Sign-in / Live Map Portal */}
      <section ref={authSectionRef} className="py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#12965f]">Live Network Access</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Sign in to open the interactive map &amp; book
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              View real-time bay availability, nearby cafes within 450m, Razorpay checkout, and your 6-digit relay PIN dashboard.
            </p>
            <div className="relative mt-6 h-[300px] w-full overflow-hidden rounded-3xl bg-[#071a36] shadow-lg">
              <canvas ref={globeCanvasRef} className="block h-full w-full" />
              <div className="pointer-events-none absolute bottom-3 left-4 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] text-sky-100 backdrop-blur-xs">
                Bengaluru · Jaipur · Pune · Mumbai · Delhi NCR
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              {cityQuery && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-900">
                  Selected location: <b>{cityQuery}</b> — Sign in below to view live bays on the map.
                </div>
              )}
              {sessionError && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-900">
                  {sessionError}
                </div>
              )}
              <AuthPanel onAuthenticated={onAuthenticated} />
            </div>
          </div>
        </div>
      </section>

      {/* Official Footer with Working Legal & Safety Routes */}
      <footer className="border-t border-slate-200 bg-[#071a36] py-12 text-xs text-sky-200/80">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-white font-extrabold text-base">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#19c37d] text-[#0b2447]">
                <BoltMark className="h-4 w-4" />
              </span>
              ChargeShare
            </div>
            <p className="mt-3 leading-relaxed text-sky-200/75">
              Community peer-to-peer EV charging network with hardware PIN relay protection and Razorpay escrow checkout.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-bold text-white uppercase tracking-wider text-[11px]">Trust &amp; Compliance</p>
            <div className="flex flex-col gap-1.5">
              <Link href="/safety" className="hover:text-white">
                Electrical Safety &amp; Host Verification
              </Link>
              <Link href="/terms" className="hover:text-white">
                Terms of Service &amp; Refund Policy
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-bold text-white uppercase tracking-wider text-[11px]">Support</p>
            <p>24x7 Driver &amp; Host Assistance via live chat widget or support@chargeshare.in</p>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-white/10 px-4 pt-6 text-[11px] text-sky-200/60">
          © {new Date().getFullYear()} ChargeShare Network. Independent peer-to-peer EV charging marketplace.
        </div>
      </footer>

      <SupportChatbot />
    </div>
  );
}
