import Link from "next/link";
import ChargerMapLoader from "./charger-map-loader";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          ChargeShare <span className="text-emerald-400">Bengaluru</span>
        </Link>
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300">
          Home EV charging
        </span>
      </header>

      <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
          Charge nearby. Share locally.
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Find a home charger around Bengaluru.
        </h1>
        <p className="mb-10 mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
          Explore neighborhood EV chargers, filter by connector, and tap a map
          pin to see power and hourly pricing.
        </p>

        <ChargerMapLoader />
      </section>

      <footer className="mx-auto w-full max-w-7xl px-6 py-6 text-sm text-zinc-500">
        Charger pins use approximate locations. Built for Bengaluru&apos;s EV
        community.
      </footer>
    </main>
  );
}
