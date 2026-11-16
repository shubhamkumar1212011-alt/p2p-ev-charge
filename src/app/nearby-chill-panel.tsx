"use client";

import { useEffect, useState } from "react";
import {
  Coffee,
  Utensils,
  Bath,
  Wifi,
  ShieldCheck,
  Car,
  Armchair,
  Navigation,
  Star,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { PublicCharger } from "@/lib/public-charger";
import type { NearbyPlace } from "@/app/api/nearby/route";

type NearbyChillPanelProps = {
  charger: PublicCharger;
};

function amenityIcon(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("washroom") || lower.includes("restroom")) return <Bath className="h-3.5 w-3.5 text-sky-400" />;
  if (lower.includes("cafe") || lower.includes("snack")) return <Coffee className="h-3.5 w-3.5 text-amber-400" />;
  if (lower.includes("covered") || lower.includes("parking")) return <Car className="h-3.5 w-3.5 text-emerald-400" />;
  if (lower.includes("wi-fi") || lower.includes("wifi")) return <Wifi className="h-3.5 w-3.5 text-indigo-400" />;
  if (lower.includes("lounge")) return <Armchair className="h-3.5 w-3.5 text-purple-400" />;
  return <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />;
}

function categoryBadge(category: NearbyPlace["category"]) {
  switch (category) {
    case "CAFE":
      return {
        label: "Cafe",
        icon: <Coffee className="h-3.5 w-3.5 text-amber-400" />,
        pill: "bg-amber-500/10 text-amber-300 border-amber-500/20",
      };
    case "RESTROOM":
      return {
        label: "Restroom",
        icon: <Bath className="h-3.5 w-3.5 text-sky-400" />,
        pill: "bg-sky-500/10 text-sky-300 border-sky-500/20",
      };
    default:
      return {
        label: category === "FAST_FOOD" ? "Quick Bite" : "Restaurant",
        icon: <Utensils className="h-3.5 w-3.5 text-emerald-400" />,
        pill: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
      };
  }
}

export default function NearbyChillPanel({ charger }: NearbyChillPanelProps) {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPlaces([]);

    fetch(`/api/nearby?lat=${charger.approxLat}&lng=${charger.approxLng}`)
      .then((res) => (res.ok ? res.json() : { places: [] }))
      .then((data: { places?: NearbyPlace[] }) => {
        if (active) setPlaces(Array.isArray(data.places) ? data.places : []);
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

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-4">
      {/* Host & Rating Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {charger.isCommunityHost ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
              <Sparkles className="h-3 w-3" /> Verified P2P Host
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-300">
              Public Grid Station
            </span>
          )}
          {charger.hostName && (
            <span className="text-xs text-slate-400">Hosted by {charger.hostName}</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-amber-400">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span>{charger.rating.toFixed(1)}</span>
          <span className="text-slate-500 font-normal">({charger.reviewCount})</span>
        </div>
      </div>

      {/* Host Access Notes */}
      {charger.description && (
        <p className="text-xs leading-relaxed text-slate-300 bg-slate-950/60 rounded-xl px-3 py-2 border border-slate-800/80">
          {charger.description}
        </p>
      )}

      {/* Host-Verified On-Site Facilities */}
      {charger.amenities.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            On-Site Host Facilities
          </p>
          <div className="flex flex-wrap gap-1.5">
            {charger.amenities.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200"
              >
                {amenityIcon(item)}
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Live Charge & Chill Walking Discovery */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            Charge &amp; Chill • Walking Distance (&lt;450m)
          </p>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />}
        </div>

        {!loading && places.length === 0 ? (
          <p className="text-xs text-slate-400">
            No mapped cafes or restrooms within 450m on OpenStreetMap for this pin.
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {places.map((place) => {
              const badge = categoryBadge(place.category);
              return (
                <div
                  key={place.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${badge.pill}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>
                      <p className="truncate text-xs font-medium text-slate-100">{place.name}</p>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {place.distanceMeters}m • {place.walkMinutes} min walk
                      {place.cuisine ? ` • ${place.cuisine}` : ""}
                    </p>
                  </div>

                  <a
                    href={place.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/90 px-2 py-1 text-[11px] font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-300 transition"
                  >
                    <Navigation className="h-3 w-3" />
                    Walk
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
