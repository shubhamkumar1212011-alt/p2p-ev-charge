"use client";

import dynamic from "next/dynamic";

const ChargerMap = dynamic(() => import("./charger-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(68vh,680px)] min-h-[420px] items-center justify-center rounded-2xl bg-zinc-900 text-sm text-zinc-400">
      Loading the Bengaluru charger map…
    </div>
  ),
});

export default function ChargerMapLoader() {
  return <ChargerMap />;
}
