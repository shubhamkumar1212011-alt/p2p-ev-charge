import Link from "next/link";

const neighborhoods = [
  "Indiranagar",
  "Koramangala",
  "Jayanagar",
  "Whitefield",
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          ChargeShare <span className="text-emerald-400">Bengaluru</span>
        </Link>
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300">
          Home EV charging
        </span>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-20">
        <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
          Charge nearby. Share locally.
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight sm:text-7xl">
          A better way to charge around Bengaluru.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
          A peer-to-peer home charging platform connecting EV drivers with
          neighborhood charger hosts.
        </p>

        <div className="mt-12">
          <h2 className="text-sm font-medium text-zinc-300">
            Sample host locations
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {neighborhoods.map((neighborhood) => (
              <li
                key={neighborhood}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300"
              >
                {neighborhood}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 py-6 text-sm text-zinc-500">
        Built for Bengaluru&apos;s EV community.
      </footer>
    </main>
  );
}
