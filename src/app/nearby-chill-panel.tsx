"use client";

import { useEffect, useState } from "react";
import { Coffee, Utensils, Bath, Sparkles, Ticket, Lock, Check, Copy } from "lucide-react";
import type { PublicCharger } from "@/lib/public-charger";
import type { NearbyPlace } from "./api/nearby/route";

type NearbyChillPanelProps = {
  charger: PublicCharger;
  isBooked?: boolean;
};

export default function NearbyChillPanel({ charger, isBooked = false }: NearbyChillPanelProps) {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPlaces([]);

    fetch(`/api/nearby?lat=${charger.approxLat}&lng=${charger.approxLng}`)
      .then((res) => (res.ok ? res.json() : { places: [] }))
      .then((data) => {
        if (!active) return;
        setPlaces(Array.isArray(data.places) ? data.places : []);
      })
      .catch(() => {
        if (active) setPlaces([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [charger.id, charger.approxLat, charger.approxLng]);

  function copyVoucher(id: string, code: string) {
    navigator.clipboard?.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#A3FF12]" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-200">
            Charge &amp; Chill · Within 300m
          </p>
        </div>
        <span className="rounded-full bg-[#1ED760]/15 px-2 py-0.5 text-[10px] font-bold text-[#A3FF12]">
          {isBooked ? "Perks Unlocked" : "Book to Unlock Offers"}
        </span>
      </div>

      {/* Host On-Site Amenities */}
      {Array.isArray(charger.amenities) && charger.amenities.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {charger.amenities.map((item) => (
            <span
              key={item}
              className="rounded-full border border-lime-300/25 bg-lime-300/10 px-2.5 py-0.5 text-[10px] font-semibold text-lime-200"
            >
              ✓ {item}
            </span>
          ))}
        </div>
      )}

      {/* 300m Cafes, Dining & Restrooms */}
      <div className="mt-3 space-y-2">
        {loading ? (
          <p className="text-[11px] text-zinc-400">Scanning cafes &amp; restrooms within 300m...</p>
        ) : places.length === 0 ? (
          <p className="text-[11px] text-zinc-500">
            No public cafes mapped within 300m—check host on-site utilities above.
          </p>
        ) : (
          places.map((place) => {
            const Icon =
              place.category === "RESTROOM"
                ? Bath
                : place.category === "RESTAURANT"
                ? Utensils
                : Coffee;

            return (
              <div
                key={place.id}
                className="rounded-xl border border-white/10 bg-zinc-950/80 p-2.5 transition hover:border-white/20"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/5 text-amber-300">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white">{place.name}</p>
                      <p className="text-[10px] text-zinc-400">
                        {place.distanceMeters}m away · {place.walkMinutes} min walk
                      </p>
                    </div>
                  </div>
                </div>

                {/* Partner Cafe Offer / Restroom Badge */}
                {place.perkTitle && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Ticket className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                      <span className="truncate text-[11px] font-semibold text-amber-100">
                        {place.perkTitle}
                      </span>
                    </div>

                    {place.perkCode && (
                      isBooked ? (
                        <button
                          type="button"
                          onClick={() => copyVoucher(place.id, place.perkCode!)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#1ED760] px-2 py-0.5 text-[10px] font-extrabold text-zinc-950 hover:bg-[#A3FF12] cursor-pointer"
                        >
                          {copiedId === place.id ? (
                            <>
                              <Check className="h-2.5 w-2.5" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-2.5 w-2.5" /> {place.perkCode}
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                          <Lock className="h-2.5 w-2.5" /> Book to Unlock
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
