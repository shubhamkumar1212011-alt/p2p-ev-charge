"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import BookingPanel from "./booking-panel";
import type { ConfirmedBooking, AuthUser } from "@/lib/api-schemas";
import {
  geocodeResultsSchema,
  publicChargersSchema,
  type PublicCharger,
} from "@/lib/public-charger";

type ChargerMapProps = {
  user: AuthUser;
};

type LocationPoint = {
  lat: number;
  lng: number;
  label: string;
};

type LocationResult = {
  name: string;
  lat: number;
  lng: number;
};

type ActivePass = {
  booking: ConfirmedBooking;
  chargerId: string;
};

type StationFilter =
  | "ALL"
  | "TYPE_2"
  | "CCS2"
  | "TYPE_1"
  | "CHADEMO"
  | "FUEL";

const fallbackLocation: LocationPoint = {
  lat: 12.9716,
  lng: 77.5946,
  label: "Bengaluru fallback",
};

const filters: { value: StationFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "TYPE_2", label: "Type 2" },
  { value: "CCS2", label: "CCS2" },
  { value: "TYPE_1", label: "Type 1" },
  { value: "CHADEMO", label: "CHAdeMO" },
  { value: "FUEL", label: "Fuel stops" },
];

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

function MapFocus({
  charger,
  location,
}: {
  charger: PublicCharger | null;
  location: LocationPoint;
}) {
  const map = useMap();

  useEffect(() => {
    const target = charger
      ? [charger.approxLat, charger.approxLng] as [number, number]
      : [location.lat, location.lng] as [number, number];
    map.flyTo(target, charger ? 15 : 13, {
      duration: 0.8,
    });
  }, [charger, location, map]);

  return null;
}

function ActivePassCard({
  activePass,
  onClose,
}: {
  activePass: ActivePass;
  onClose: () => void;
}) {
  const [relayPowered, setRelayPowered] = useState(false);
  const [relayBusy, setRelayBusy] = useState(false);
  const [relayError, setRelayError] = useState<string | null>(null);

  async function toggleRelay() {
    if (relayPowered) {
      setRelayPowered(false);
      setRelayError(null);
      return;
    }

    setRelayBusy(true);
    setRelayError(null);
    try {
      const response = await fetch("/api/charger/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargerId: activePass.chargerId,
          unlockPin: activePass.booking.unlockPin,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Unable to verify the charger relay.";
        throw new Error(message);
      }

      setRelayPowered(true);
    } catch (error) {
      setRelayError(
        error instanceof Error
          ? error.message
          : "Unable to verify the charger relay.",
      );
    } finally {
      setRelayBusy(false);
    }
  }

  return (
    <aside className="active-pass-card absolute bottom-4 right-4 z-[700] w-[min(390px,calc(100%-2rem))] rounded-3xl border border-white/10 bg-[#14181F]/95 p-4 text-white shadow-2xl shadow-black/60 backdrop-blur-xl sm:bottom-6 sm:right-6 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-300">
            Active pass & smart relay
          </p>
          <h3 className="mt-1 text-sm font-bold">{activePass.booking.charger.title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close active pass"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-400 hover:text-white"
        >
          ×
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-300">
        {activePass.booking.charger.exactAddress}
      </p>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Unlock PIN
        </span>
        <span className="font-mono text-lg font-bold tracking-[0.25em] text-lime-200">
          {activePass.booking.unlockPin}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-white">Smart charger relay</p>
          <p className="mt-0.5 text-[10px] text-zinc-500">
            {relayPowered ? "Power on" : "Ready to test"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={relayPowered}
          aria-label="Test smart charger relay power"
          onClick={toggleRelay}
          disabled={relayBusy}
          className={`relative h-8 w-[58px] shrink-0 rounded-full border transition ${
            relayPowered
              ? "border-lime-300/60 bg-lime-300/20 shadow-[0_0_22px_rgba(163,255,18,0.16)]"
              : "border-white/15 bg-white/5"
          } disabled:opacity-60`}
        >
          <span
            className={`absolute top-1 size-6 rounded-full shadow transition-all ${
              relayPowered
                ? "left-[30px] bg-[#A3FF12]"
                : "left-1 bg-zinc-400"
            }`}
          />
        </button>
      </div>
      {relayError && (
        <p className="mt-2 text-xs text-rose-300" role="alert">
          {relayError}
        </p>
      )}
    </aside>
  );
}

export default function ChargerMap({ user }: ChargerMapProps) {
  const [location, setLocation] = useState(fallbackLocation);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [chargers, setChargers] = useState<PublicCharger[]>([]);
  const [selectedCharger, setSelectedCharger] =
    useState<PublicCharger | null>(null);
  const [activePass, setActivePass] = useState<ActivePass | null>(null);
  const [filter, setFilter] = useState<StationFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState(false);
  const manualLocationSelected = useRef(false);

  const requestGps = useCallback((force = true) => {
    if (!navigator.geolocation) {
      if (force || !manualLocationSelected.current) {
        setLocation(fallbackLocation);
        setLocationMessage(
          "GPS is unavailable. Showing Bengaluru; search any location.",
        );
      }
      return;
    }

    setIsLocating(true);
    setLocationMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!force && manualLocationSelected.current) {
          setIsLocating(false);
          return;
        }
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "Your live location",
        });
        setSelectedCharger(null);
        setLocationSearch("");
        setLocationResults([]);
        setIsLocating(false);
      },
      () => {
        if (force || !manualLocationSelected.current) {
          setLocation(fallbackLocation);
          setLocationMessage(
            "Location permission was denied. Showing Bengaluru; search any location.",
          );
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => requestGps(false), 0);
    return () => window.clearTimeout(timer);
  }, [requestGps]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const query = locationSearch.trim();
      if (query.length < 3) {
        setLocationResults([]);
        setLocationSearchError(null);
        return;
      }

      setIsSearching(true);
      setLocationSearchError(null);
      try {
        const response = await fetch(
          `/api/geocode?q=${encodeURIComponent(query)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error("Location search is temporarily unavailable.");
        }
        const results = geocodeResultsSchema.safeParse(payload);
        if (!results.success) {
          throw new Error("The location search returned invalid results.");
        }
        setLocationResults(results.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLocationSearchError(
          error instanceof Error
            ? error.message
            : "Location search is temporarily unavailable.",
        );
        setLocationResults([]);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 1_000);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [locationSearch]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadChargers() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const query = new URLSearchParams({
          lat: String(location.lat),
          lng: String(location.lng),
        });
        const response = await fetch(`/api/chargers?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error("Could not load nearby stations. Please retry.");
        }
        const result = publicChargersSchema.safeParse(payload);
        if (!result.success) {
          throw new Error("Nearby station data could not be displayed.");
        }
        setChargers(result.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load nearby stations. Please retry.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadChargers();
    return () => controller.abort();
  }, [location.lat, location.lng]);

  const filteredChargers = useMemo(
    () =>
      chargers.filter((charger) => {
        if (filter === "ALL") return true;
        if (filter === "FUEL") return charger.stationType === "FUEL";
        return charger.connectorType === filter;
      }),
    [chargers, filter],
  );

  function chooseLocation(result: LocationResult) {
    manualLocationSelected.current = true;
    setLocation({
      lat: result.lat,
      lng: result.lng,
      label: result.name.split(",").slice(0, 2).join(","),
    });
    setLocationSearch("");
    setLocationResults([]);
    setSelectedCharger(null);
    setLocationMessage(null);
  }

  function confirmBooking(booking: ConfirmedBooking) {
    if (!selectedCharger) return;
    setActivePass({ booking, chargerId: selectedCharger.id });
    setSelectedCharger(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="station-sidebar flex h-[55%] min-h-0 w-full flex-none flex-col border-b border-white/[0.08] bg-[#11151B]/95 md:h-full md:w-[420px] md:border-b-0 md:border-r">
        <div className="border-b border-white/[0.07] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-300">
                Global station finder
              </p>
              <h1 className="mt-1 text-lg font-bold tracking-tight text-white">
                Nearby energy
              </h1>
            </div>
            <button
              type="button"
              onClick={() => requestGps()}
              disabled={isLocating}
              className="rounded-full border border-lime-300/20 bg-lime-300/[0.08] px-3 py-2 text-[11px] font-bold text-lime-200 transition hover:bg-lime-300/15 disabled:opacity-60"
            >
              {isLocating ? "Locating…" : "Use My GPS"}
            </button>
          </div>

          <form
            className="relative mt-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (locationResults[0]) chooseLocation(locationResults[0]);
            }}
          >
            <label className="sr-only" htmlFor="global-location-search">
              Search for any city, area, or landmark
            </label>
            <input
              id="global-location-search"
              type="search"
              value={locationSearch}
              onChange={(event) => setLocationSearch(event.currentTarget.value)}
              placeholder="Search any city, area or landmark"
              autoComplete="off"
              className="w-full rounded-2xl border border-white/[0.09] bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-300/50"
            />
            {(isSearching || locationResults.length > 0) && (
              <div className="absolute inset-x-0 top-full z-[1200] mt-2 max-h-56 overflow-auto rounded-2xl border border-white/10 bg-[#14181F] p-1 shadow-2xl">
                {isSearching && (
                  <p className="px-3 py-2 text-xs text-zinc-500">
                    Searching OpenStreetMap…
                  </p>
                )}
                {locationResults.map((result) => (
                  <button
                    key={`${result.lat}:${result.lng}:${result.name}`}
                    type="button"
                    onClick={() => chooseLocation(result)}
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-xs leading-5 text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                  >
                    {result.name}
                  </button>
                ))}
              </div>
            )}
          </form>
          {locationSearchError && (
            <p className="mt-2 text-xs text-rose-300" role="alert">
              {locationSearchError}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="truncate text-[10px] text-zinc-500" title={location.label}>
              Searching near {location.label}
            </p>
            {locationMessage && (
              <p className="text-right text-[10px] text-amber-200/80" role="status">
                {locationMessage}
              </p>
            )}
          </div>

          <div
            className="mt-3 flex gap-1.5 overflow-x-auto pb-1"
            aria-label="Station and connector filters"
          >
            {filters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
                className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-semibold transition ${
                  filter === option.value
                    ? "border-lime-300/40 bg-lime-300 text-zinc-950"
                    : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {selectedCharger ? (
            <BookingPanel
              key={`${selectedCharger.id}:${user.id}`}
              charger={selectedCharger}
              user={user}
              onClose={() => setSelectedCharger(null)}
              onConfirmed={confirmBooking}
            />
          ) : (
            <div className="h-full overflow-y-auto p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                  OpenStreetMap stations
                </p>
                <span className="text-[10px] text-zinc-500">
                  {isLoading ? "Refreshing…" : `${filteredChargers.length} nearby`}
                </span>
              </div>

              {isLoading && (
                <div className="space-y-2 p-1" aria-live="polite">
                  <div className="skeleton-line h-24 rounded-2xl" />
                  <div className="skeleton-line h-24 rounded-2xl" />
                </div>
              )}
              {errorMessage && (
                <p className="m-1 rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-3 text-xs text-rose-200" role="alert">
                  {errorMessage}
                </p>
              )}
              {!isLoading &&
                !errorMessage &&
                filteredChargers.map((charger) => {
                const isNearest = charger.id === filteredChargers[0]?.id;
                  return (
                    <button
                      key={charger.id}
                      type="button"
                      onClick={() => setSelectedCharger(charger)}
                      className="charger-card group mb-2 w-full rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 text-left transition hover:border-lime-300/35 hover:bg-lime-300/[0.04]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="max-w-full truncate text-sm font-bold text-white">
                              {charger.title}
                            </p>
                            {isNearest && (
                              <span className="rounded-full bg-lime-300/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-lime-200">
                                Nearest
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[10px] text-zinc-500">
                            {charger.stationType === "FUEL"
                              ? "Fuel / EV stop"
                              : charger.connectorType.replace("_", " ")}
                            {" · "}
                            {charger.distanceKm.toFixed(1)} km away
                          </p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-lime-300/10 px-2 py-1.5 text-[10px] font-extrabold text-lime-200">
                          {charger.powerKw} kW est.
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-100">
                          {inrFormatter.format(charger.pricePerHour)}
                          <span className="ml-1 text-[10px] font-medium text-zinc-500">
                            / hr est.
                          </span>
                        </span>
                        <span className="text-[10px] font-bold text-zinc-500 transition group-hover:text-lime-200">
                          BOOK STATION →
                        </span>
                      </div>
                    </button>
                  );
                })}
              {!isLoading &&
                !errorMessage &&
                filteredChargers.length === 0 && (
                  <div className="m-1 rounded-2xl border border-dashed border-white/10 p-5 text-center">
                    <p className="text-sm font-semibold text-zinc-300">
                      No nearby stations found
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Search another location or refresh your GPS.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
        <div className="border-t border-white/[0.07] px-4 py-2.5 text-[9px] text-zinc-600">
          Locations from OpenStreetMap · rates and power are estimates
        </div>
      </aside>

      <section
        aria-label="Global station map"
        className="relative min-h-0 flex-1 bg-[#0B0D10] p-2 md:p-3"
      >
        <div className="relative h-full overflow-hidden rounded-[24px] border border-white/[0.07]">
          <MapContainer
            center={[fallbackLocation.lat, fallbackLocation.lng]}
            zoom={13}
            scrollWheelZoom
            className="h-full w-full"
            aria-label="Interactive OpenStreetMap with nearby stations"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFocus charger={selectedCharger} location={location} />
            <Marker position={[location.lat, location.lng]} icon={evIcon}>
              <Popup>
                <strong>Your EV location</strong>
                <br />
                {location.label}
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
                  click: () => setSelectedCharger(charger),
                }}
              >
                <Popup>
                  <div className="min-w-40 space-y-1">
                    <p className="font-bold text-white">{charger.title}</p>
                    <p>
                      {charger.stationType === "FUEL"
                        ? "Fuel / EV stop · estimated specs"
                        : `${charger.powerKw} kW · estimated rate`}
                    </p>
                    <p className="font-semibold text-white">
                      {inrFormatter.format(charger.pricePerHour)} / hour
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedCharger(charger)}
                      className="mt-1 w-full rounded-lg bg-[#1ED760] px-3 py-2 text-xs font-extrabold text-zinc-950 hover:bg-[#A3FF12]"
                    >
                      Book station
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="map-location-legend">
            <span className="map-legend-dot map-legend-charger" />
            Station
            <span className="map-legend-dot map-legend-ev" />
            Your location
          </div>
          {activePass && (
            <ActivePassCard
              key={activePass.booking.id}
              activePass={activePass}
              onClose={() => setActivePass(null)}
            />
          )}
        </div>
      </section>
    </div>
  );
}
