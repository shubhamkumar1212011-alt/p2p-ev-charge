"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import BookingPanel from "./booking-panel";
import type { AuthUser } from "@/lib/api-schemas";
import {
  connectorLabels,
  publicChargersSchema,
  type PublicCharger,
} from "@/lib/public-charger";

type ChargerMapProps = {
  user: AuthUser | null;
};

type ChargerFilter = "ALL" | "TYPE_2" | "SOCKET_15A";

const filters: { value: ChargerFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "TYPE_2", label: "Type-2" },
  { value: "SOCKET_15A", label: "15A 3-Pin" },
];

const bengaluruCenter: [number, number] = [12.9716, 77.5946];
const simulatedEvLocation: [number, number] = [12.9668, 77.6068];

const chargerIcon = L.divIcon({
  className: "",
  html: '<span class="charger-map-pin" aria-hidden="true"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const selectedChargerIcon = L.divIcon({
  className: "",
  html: '<span class="charger-map-pin is-selected" aria-hidden="true"></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const evIcon = L.divIcon({
  className: "",
  html: '<span class="ev-map-pin" aria-hidden="true"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function distanceFromEv(charger: PublicCharger) {
  const [evLat, evLng] = simulatedEvLocation;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = radians(charger.approxLat - evLat);
  const lngDelta = radians(charger.approxLng - evLng);
  const arc =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(evLat)) *
      Math.cos(radians(charger.approxLat)) *
      Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function MapFocus({ charger }: { charger: PublicCharger | null }) {
  const map = useMap();

  useEffect(() => {
    if (charger) {
      map.flyTo([charger.approxLat, charger.approxLng], 14, {
        duration: 0.8,
      });
    }
  }, [charger, map]);

  return null;
}

export default function ChargerMap({ user }: ChargerMapProps) {
  const [chargers, setChargers] = useState<PublicCharger[]>([]);
  const [selectedCharger, setSelectedCharger] =
    useState<PublicCharger | null>(null);
  const [filter, setFilter] = useState<ChargerFilter>("ALL");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadChargers() {
      try {
        const response = await fetch("/api/chargers", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Could not load chargers. Please try again.");
        }

        const payload: unknown = await response.json();
        const result = publicChargersSchema.safeParse(payload);
        if (!result.success) {
          throw new Error("The charger data could not be displayed.");
        }

        setChargers(result.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load chargers. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadChargers();
    return () => controller.abort();
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const allowedConnectors =
    filter === "ALL" ? null : filter === "TYPE_2" ? ["TYPE_2"] : [];
  const filteredChargers = chargers.filter((charger) => {
    const matchesConnector =
      allowedConnectors === null ||
      allowedConnectors.includes(charger.connectorType);
    const matchesSearch =
      !normalizedSearch ||
      charger.title.toLowerCase().includes(normalizedSearch) ||
      connectorLabels[charger.connectorType]
        .toLowerCase()
        .includes(normalizedSearch);
    return matchesConnector && matchesSearch;
  });

  function selectFilter(value: ChargerFilter) {
    setFilter(value);
    setSelectedCharger(null);
  }

  function selectCharger(charger: PublicCharger) {
    setSelectedCharger(charger);
  }

  return (
    <>
      <div className="finder-grid grid gap-4 xl:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.65fr)]">
        <aside className="glass-panel flex min-h-[620px] flex-col overflow-hidden rounded-[26px]">
          <div className="border-b border-white/[0.07] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-300">
                  Your neighborhood
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                  Nearby Vibes
                </h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-400">
                {isLoading ? "…" : `${filteredChargers.length} spots`}
              </span>
            </div>

            <label className="relative mt-5 block">
              <span className="sr-only">Search chargers</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-zinc-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 4.5 4.5" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search areas or connectors"
                className="w-full rounded-2xl border border-white/[0.08] bg-black/25 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-300/50 focus:bg-black/40"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2" aria-label="Connector filter">
              {filters.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectFilter(option.value)}
                  aria-pressed={filter === option.value}
                  className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                    filter === option.value
                      ? "border-lime-300/40 bg-lime-300 text-zinc-950 shadow-[0_0_22px_rgba(163,255,18,0.12)]"
                      : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
            {isLoading && (
              <div className="space-y-3 p-3" aria-live="polite">
                <div className="skeleton-line h-24 rounded-2xl" />
                <div className="skeleton-line h-24 rounded-2xl" />
                <p className="text-xs text-zinc-500">Tuning into nearby chargers…</p>
              </div>
            )}
            {errorMessage && (
              <p className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-200" role="alert">
                {errorMessage}
              </p>
            )}
            {!isLoading &&
              !errorMessage &&
              filteredChargers.map((charger) => {
                const isSelected = selectedCharger?.id === charger.id;
                return (
                  <button
                    key={charger.id}
                    type="button"
                    onClick={() => selectCharger(charger)}
                    aria-pressed={isSelected}
                    className={`charger-card group w-full rounded-2xl border p-4 text-left transition duration-200 ${
                      isSelected
                        ? "border-lime-300/55 bg-lime-300/[0.07] shadow-[inset_0_0_26px_rgba(163,255,18,0.035),0_0_24px_rgba(30,215,96,0.07)]"
                        : "border-white/[0.07] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {charger.title.replace("Home charger in ", "")}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {connectorLabels[charger.connectorType]}{" "}
                          <span className="px-1">·</span> about{" "}
                          {distanceFromEv(charger).toFixed(1)} km away
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-lime-300/10 px-2.5 py-1.5 text-xs font-extrabold text-lime-200">
                        {charger.powerKw} kW
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm font-bold text-zinc-100">
                        {inrFormatter.format(charger.pricePerHour)}
                        <span className="ml-1 text-xs font-medium text-zinc-500">
                          / hr
                        </span>
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isSelected
                            ? "text-lime-200"
                            : "text-zinc-500 group-hover:text-lime-200"
                        }`}
                      >
                        {isSelected ? "SELECTED ✓" : "SELECT"}
                      </span>
                    </div>
                  </button>
                );
              })}
            {!isLoading &&
              !errorMessage &&
              filteredChargers.length === 0 && (
                <div className="m-2 rounded-2xl border border-dashed border-white/10 p-6 text-center">
                  <span className="text-2xl" aria-hidden="true">
                    ◌
                  </span>
                  <p className="mt-2 text-sm font-semibold text-zinc-300">
                    No chargers on this frequency
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Try another connector or search.
                  </p>
                </div>
              )}
          </div>
          <div className="border-t border-white/[0.07] px-5 py-3.5 text-[11px] text-zinc-500">
            <span className="mr-2 inline-block size-1.5 rounded-full bg-lime-300 shadow-[0_0_8px_#A3FF12]" />
            Approximate locations · live availability
          </div>
        </aside>

        <section
          aria-label="Charger map"
          className="glass-panel overflow-hidden rounded-[26px] p-3 sm:p-4"
        >
          <div className="flex items-center justify-between gap-4 px-2 pb-3 pt-1 sm:px-3">
            <div>
              <p className="text-sm font-bold text-white">Bengaluru, India</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Pick a pin or a charger to get started
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime-300 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-lime-300" />
              </span>
              Live map
            </div>
          </div>

          <div className="map-frame relative h-[520px] overflow-hidden rounded-[20px] border border-white/[0.07] sm:h-[640px] xl:h-[660px]">
            <MapContainer
              center={bengaluruCenter}
              zoom={12}
              scrollWheelZoom
              className="h-full w-full"
              aria-label="Interactive map of available EV chargers in Bengaluru"
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <MapFocus charger={selectedCharger} />

              <Marker position={simulatedEvLocation} icon={evIcon}>
                <Popup>
                  <strong>My EV Location</strong>
                  <br />
                  Your simulated starting point
                </Popup>
              </Marker>

              {filteredChargers.map((charger) => (
                <Marker
                  key={charger.id}
                  position={[charger.approxLat, charger.approxLng]}
                  icon={
                    selectedCharger?.id === charger.id
                      ? selectedChargerIcon
                      : chargerIcon
                  }
                  eventHandlers={{
                    click: () => selectCharger(charger),
                  }}
                >
                  <Popup>
                    <div className="min-w-44 space-y-1.5">
                      <p className="font-bold text-white">{charger.title}</p>
                      <p>{connectorLabels[charger.connectorType]}</p>
                      <p>{charger.powerKw} kW power</p>
                      <p className="font-semibold text-white">
                        {inrFormatter.format(charger.pricePerHour)} / hour
                      </p>
                      <button
                        type="button"
                        onClick={() => selectCharger(charger)}
                        className="mt-1 w-full rounded-lg bg-[#1ED760] px-3 py-2 text-xs font-extrabold text-zinc-950 hover:bg-[#A3FF12]"
                      >
                        Select charger
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            <div className="map-location-legend">
              <span className="map-legend-dot map-legend-charger" />
              Charger
              <span className="map-legend-dot map-legend-ev" />
              Your EV
            </div>
          </div>
          <p className="px-2 pt-3 text-[10px] text-zinc-600">
            Map data © OpenStreetMap contributors · Tiles © CARTO · pins show
            approximate locations
          </p>
        </section>
      </div>

      {selectedCharger && (
        <BookingPanel
          key={`${selectedCharger.id}:${user?.id ?? "signed-out"}`}
          charger={selectedCharger}
          user={user}
          onClose={() => setSelectedCharger(null)}
        />
      )}
    </>
  );
}
