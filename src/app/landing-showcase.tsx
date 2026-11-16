"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles, Torus } from "@react-three/drei";
import { motion, useScroll, useTransform } from "framer-motion";
import type * as THREE from "three";
import {
  Zap,
  Coffee,
  ShieldCheck,
  MapPin,
  ArrowDownRight,
  PlugZap,
  Sparkles as SparklesIcon,
} from "lucide-react";
import AuthPanel from "./auth-panel";
import type { AuthUser } from "@/lib/api-schemas";

type LandingShowcaseProps = {
  onAuthenticated: (user: AuthUser) => void;
  sessionError: string | null;
};

function ChargingCoreMesh({ scrollProgressRef }: { scrollProgressRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const scroll = scrollProgressRef.current;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.35 + scroll * Math.PI * 2;
      groupRef.current.rotation.x = Math.sin(t * 0.4) * 0.18 + scroll * 0.65;
      const targetScale = 1 + Math.sin(scroll * Math.PI) * 0.22;
      groupRef.current.scale.lerp({ x: targetScale, y: targetScale, z: targetScale } as THREE.Vector3, delta * 5);
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z += delta * 0.5;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.x -= delta * 0.75;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={2.2} rotationIntensity={0.35} floatIntensity={0.6}>
        {/* High-voltage emerald plasma core */}
        <mesh>
          <icosahedronGeometry args={[1.15, 4]} />
          <MeshDistortMaterial
            color="#1ED760"
            emissive="#0f9d44"
            emissiveIntensity={0.65}
            roughness={0.18}
            metalness={0.85}
            distort={0.28}
            speed={2.4}
          />
        </mesh>

        {/* Outer induction stator ring */}
        <Torus ref={outerRingRef} args={[1.95, 0.045, 24, 100]} rotation={[Math.PI / 3, 0.2, 0]}>
          <meshStandardMaterial color="#A3FF12" emissive="#A3FF12" emissiveIntensity={0.8} roughness={0.2} />
        </Torus>

        {/* Inner phase ring */}
        <Torus ref={innerRingRef} args={[1.55, 0.03, 20, 80]} rotation={[-Math.PI / 4, 0.5, 0]}>
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.7} roughness={0.25} />
        </Torus>
      </Float>

      <Sparkles count={70} scale={5.5} size={2.2} speed={0.45} color="#A3FF12" />
    </group>
  );
}

export default function LandingShowcase({ onAuthenticated, sessionError }: LandingShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef(0);

  const { scrollYProgress } = useScroll({ target: containerRef });
  scrollYProgress.on("change", (latest) => {
    scrollProgressRef.current = latest;
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0.15]);
  const heroY = useTransform(scrollYProgress, [0, 0.35], [0, -60]);

  function scrollToPortal() {
    document.getElementById("access-portal")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#07090C] text-white selection:bg-[#1ED760] selection:text-zinc-950 overflow-x-hidden">
      {/* Persistent 3D Interactive Canvas */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-85">
        <Canvas camera={{ position: [0, 0, 5.4], fov: 45 }} dpr={[1, 2]}>
          <ambientLight intensity={0.45} />
          <pointLight position={[6, 6, 6]} intensity={2.4} color="#1ED760" />
          <pointLight position={[-6, -4, 4]} intensity={1.6} color="#38bdf8" />
          <ChargingCoreMesh scrollProgressRef={scrollProgressRef} />
        </Canvas>
      </div>

      {/* Subtle radial vignette */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_15%,#07090C_82%)]" />

      {/* Sticky Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07090C]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#1ED760] text-zinc-950 shadow-[0_0_25px_rgba(30,215,96,0.4)]">
              <Zap className="h-5 w-5 fill-zinc-950" />
            </span>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white">ChargeShare</span>
              <span className="ml-2 rounded-full border border-[#1ED760]/30 bg-[#1ED760]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#A3FF12]">
                P2P Grid
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={scrollToPortal}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#1ED760]/50 hover:text-white transition cursor-pointer"
            >
              List Your Charger
            </button>
            <button
              type="button"
              onClick={scrollToPortal}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1ED760] px-4 py-2 text-xs font-extrabold text-zinc-950 hover:bg-[#A3FF12] transition cursor-pointer"
            >
              Open Live Map <ArrowDownRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Section 1: Scroll-Reactive Hero */}
      <motion.section
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative z-10 mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-center px-5 py-20"
      >
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1ED760]/30 bg-[#1ED760]/10 px-3.5 py-1.5 text-xs font-semibold text-[#A3FF12] mb-6">
            <SparklesIcon className="h-3.5 w-3.5" /> Peer-to-Peer EV Charging &amp; Verified Hospitality
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.06] text-white">
            Charge your EV anywhere.{" "}
            <span className="bg-gradient-to-r from-[#1ED760] via-[#A3FF12] to-sky-400 bg-clip-text text-transparent">
              Chill while you power up.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg leading-relaxed text-zinc-300 max-w-xl">
            Book verified home, apartment, and cafe chargers in real time—complete with live walking discovery for specialty coffee, dining, and clean restrooms within 450 meters.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              onClick={scrollToPortal}
              className="inline-flex items-center gap-2 rounded-full bg-[#1ED760] px-7 py-3.5 text-sm font-extrabold text-zinc-950 shadow-[0_12px_40px_rgba(30,215,96,0.35)] hover:bg-[#A3FF12] transition cursor-pointer"
            >
              <MapPin className="h-4 w-4" /> Explore Live Chargers
            </button>
            <button
              type="button"
              onClick={scrollToPortal}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-zinc-900/80 px-6 py-3.5 text-sm font-bold text-white hover:border-[#1ED760]/50 transition cursor-pointer"
            >
              <PlugZap className="h-4 w-4 text-[#1ED760]" /> Become a Host
            </button>
          </div>
        </div>
      </motion.section>

      {/* Section 2: Three Core Real-World Pillars */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/75 p-6 backdrop-blur-xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1ED760]/15 border border-[#1ED760]/30 text-[#1ED760] mb-4">
              <PlugZap className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Real Community Chargers</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Homeowners and commercial hosts publish live Type 2 AC &amp; CCS2 DC points with exact kW ratings, hourly tariffs, and verified on-site facilities.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/75 p-6 backdrop-blur-xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-4">
              <Coffee className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Charge &amp; Chill Discovery</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Every station pin queries live geospatial data to surface real cafes, restaurants, and public restrooms within a 5-minute walk.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/75 p-6 backdrop-blur-xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Razorpay Escrow &amp; PIN Unlock</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Exact driveway addresses and your 6-digit smart charger relay unlock PIN are released automatically upon verified payment confirmation.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Direct Authentication & Live Map Entry */}
      <section id="access-portal" className="relative z-10 mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 rounded-3xl border border-white/10 bg-zinc-950/85 p-6 sm:p-10 backdrop-blur-2xl shadow-2xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#A3FF12]">
              Instant Access
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-white">
              Sign in to enter the live Bengaluru &amp; India EV grid.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Create an account or log in to discover live community &amp; public chargers, inspect walking-distance cafes and washrooms, book slots, or publish your own charger in under 60 seconds.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <AuthPanel onAuthenticated={onAuthenticated} />
            {sessionError && (
              <p className="mt-4 text-xs text-zinc-400" role="status">
                {sessionError}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
