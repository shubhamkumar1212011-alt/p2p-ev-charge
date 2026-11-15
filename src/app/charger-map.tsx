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
  onLogout: () => void;
  isLoggingOut: boolean;
  logoutError: string | null;
};

type LocationPoint = {
  lat: number;
  lng: number;
  label: string;
  heading?: number;
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
  | "FAST"
  | "AVAILABLE";

const fallbackLocation: LocationPoint = {
  lat: 12.9716,
  lng: 77.5946,
  label: "Bengaluru fallback",
};

const filters: { value: StationFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "FAST", label: "Fast Charger" },
  { value: "AVAILABLE", label: "Available" },
];

function chargerIcon(charger: PublicCharger, selected: boolean) {
  const distance = charger.distanceKm.toFixed(1);
  return L.divIcon({
    className: "",
    html: `<span class="station-map-marker${selected ? " is-selected" : ""}" aria-label="${distance} kilometers away"><span class="station-map-distance">${distance} km</span><span class="station-map-dot" aria-hidden="true"></span></span>`,
    iconSize: [84, 48],
    iconAnchor: [42, 44],
  });
}

function evIcon(heading = 0) {
  return L.divIcon({
    className: "",
    html: `<span class="ev-direction-marker" style="--ev-heading:${heading}deg" aria-label="Your EV location"><span class="ev-direction-arrow" aria-hidden="true">▲</span></span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

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
    <aside className="active-pass-card absolute bottom-4 right-4 z-[1200] w-[min(390px,calc(100%-2rem))] rounded-3xl border border-white/10 bg-[#14181F]/95 p-4 text-white shadow-2xl shadow-black/60 backdrop-blur-xl sm:bottom-6 sm:right-6 sm:p-5">
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

export default function ChargerMap({
  user,
  onLogout,
  isLoggingOut,
  logoutError,
}: ChargerMapProps) {
  const [location, setLocation] = useState(fallbackLocation);
  const [evLocation, setEvLocation] = useState(fallbackLocation);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [hasGpsFix, setHasGpsFix] = useState(false);
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
        setEvLocation(fallbackLocation);
        setHasGpsFix(false);
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
        const liveLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "Your live location",
          heading: position.coords.heading ?? 0,
        };
        setLocation(liveLocation);
        setEvLocation(liveLocation);
        setHasGpsFix(true);
        setSelectedCharger(null);
        setLocationSearch("");
        setLocationResults([]);
        setIsLocating(false);
      },
      () => {
        if (force || !manualLocationSelected.current) {
          setLocation(fallbackLocation);
          setEvLocation(fallbackLocation);
          setHasGpsFix(false);
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
        if (filter === "FAST") return charger.powerKw >= 22;
        if (filter === "AVAILABLE") return charger.isAvailable;
        return true;
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
    <div className="fixed inset-0 h-full w-full overflow-hidden bg-[#0B0D10]">
      <MapContainer
        center={[fallbackLocation.lat, fallbackLocation.lng]}
        zoom={13}
        scrollWheelZoom
        className="absolute inset-0 h-full w-full"
        aria-label="Interactive OpenStreetMap with nearby stations"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFocus charger={selectedCharger} location={location} />
        <Marker
          position={[evLocation.lat, evLocation.lng]}
          icon={evIcon(evLocation.heading)}
        >
          <Popup>
            <strong>Your EV location</strong>
            <br />
            {evLocation.label}
          </Popup>
        </Marker>
        {filteredChargers.map((charger) => (
          <Marker
            key={charger.id}
            position={[charger.approxLat, charger.approxLng]}
            icon={chargerIcon(charger, selectedCharger?.id === charger.id)}
            eventHandlers={{ click: () => setSelectedCharger(charger) }}
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

      <header className="console-status-pill absolute left-1/2 top-4 z-[1400] flex w-[min(760px,calc(100%-1.5rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-full border border-white/10 bg-[#0B0D10]/80 px-3 py-2 text-white shadow-2xl shadow-black/30 backdrop-blur-xl sm:top-5 sm:px-5 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#1ED760] text-zinc-950 shadow-[0_0_22px_rgba(30,215,96,0.28)]">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="currentColor">
              <path d="M11.16 1.7 4.7 10.1a.75.75 0 0 0 .6 1.2h4.02l-.48 6.99a.25.25 0 0 0 .45.17l6.03-8.8a.75.75 0 0 0-.62-1.17h-3.89l.8-6.57a.25.25 0 0 0-.45-.2Z" />
            </svg>
          </span>
          <span className="truncate text-[10px] font-black tracking-[0.13em] sm:text-xs">
            P2P EV CHARGE
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[9px] font-semibold text-zinc-300 sm:px-3 sm:text-[10px]">
            <span className={`size-1.5 rounded-full ${hasGpsFix ? "bg-sky-400 shadow-[0_0_9px_#38bdf8]" : "bg-zinc-500"}`} />
            <span className="sm:hidden">{isLocating ? "GPS…" : hasGpsFix ? "GPS" : "GPS —"}</span>
            <span className="hidden sm:inline">{isLocating ? "GPS locating" : hasGpsFix ? "GPS Connected" : "GPS fallback"}</span>
          </span>
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[9px] font-semibold text-zinc-300 sm:px-3 sm:text-[10px]">
            {isLoading ? "…" : <><span className="sm:hidden">{chargers.length}</span><span className="hidden sm:inline">{chargers.length} stations</span></>}
          </span>
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[10px] font-bold text-zinc-200 transition hover:border-lime-300/30 hover:bg-lime-300/10 hover:text-lime-100 disabled:opacity-50 sm:px-4 sm:text-[11px]"
          >
            {isLoggingOut ? "Signing out…" : "Log Out"}
          </button>
        </div>
        {logoutError && (
          <p className="absolute right-2 top-[calc(100%+0.5rem)] rounded-xl border border-rose-300/20 bg-[#14181F] px-3 py-2 text-xs text-rose-300 shadow-xl" role="alert">
            {logoutError}
          </p>
        )}
      </header>

      <aside
        className={`explore-panel absolute left-5 top-24 bottom-5 z-[1100] flex w-[380px] max-h-[calc(100vh-110px)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0B0D10]/85 text-white shadow-2xl shadow-black/40 backdrop-blur-xl ${
          selectedCharger ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="border-b border-white/[0.08] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-300">
                Live discovery
              </p>
              <h1 className="mt-1 text-lg font-bold tracking-tight">
                Explore Charger Hubs
              </h1>
            </div>
            <button
              type="button"
              onClick={() => requestGps()}
              disabled={isLocating}
              aria-label="Locate me using GPS"
              className="grid size-10 shrink-0 place-items-center rounded-full border border-lime-300/25 bg-lime-300/[0.08] text-lime-200 transition hover:bg-lime-300/15 disabled:opacity-60"
            >
              <span aria-hidden="true">{isLocating ? "…" : "◎"}</span>
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
              placeholder="Search city, area or landmark"
              autoComplete="off"
              className="w-full rounded-2xl border border-white/[0.09] bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-300/50"
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
          {locationMessage && (
            <p className="mt-2 text-[10px] leading-4 text-amber-200/80" role="status">
              {locationMessage}
            </p>
          )}
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" aria-label="Station filters">
            {filters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-[10px] font-semibold transition ${
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

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              Nearest stations
            </p>
            <span className="text-[10px] text-zinc-500">
              {isLoading ? "Refreshing…" : `${filteredChargers.length} found`}
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
            filteredChargers.map((charger, index) => {
              const isSelected = selectedCharger?.id === charger.id;
              return (
                <button
                  key={charger.id}
                  type="button"
                  onClick={() => setSelectedCharger(charger)}
                  aria-pressed={isSelected}
                  className={`charger-card group mb-2 w-full rounded-2xl border p-3.5 text-left transition ${
                    isSelected
                      ? "border-lime-300/60 bg-lime-300/[0.07] shadow-[0_0_24px_rgba(30,215,96,0.08)]"
                      : "border-white/[0.07] bg-white/[0.025] hover:border-lime-300/35 hover:bg-lime-300/[0.04]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="max-w-full truncate text-sm font-bold text-white">
                          {charger.title}
                        </p>
                        {index === 0 && (
                          <span className="rounded-full bg-lime-300/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-lime-200">
                            #1 Nearest
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        {charger.distanceKm.toFixed(1)} km away ·{" "}
                        {charger.stationType === "FUEL"
                          ? "Fuel / EV stop"
                          : charger.connectorType.replace("_", " ")}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-lime-300/10 px-2 py-1.5 text-[10px] font-extrabold text-lime-200">
                      {charger.powerKw} kW
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-100">
                      {inrFormatter.format(charger.pricePerHour)}
                      <span className="ml-1 text-[10px] font-medium text-zinc-500">/ hr est.</span>
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500 transition group-hover:text-lime-200">
                      {isSelected ? "SELECTED" : "SELECT →"}
                    </span>
                  </div>
                </button>
              );
            })}
          {!isLoading && !errorMessage && filteredChargers.length === 0 && (
            <div className="m-1 rounded-2xl border border-dashed border-white/10 p-5 text-center">
              <p className="text-sm font-semibold text-zinc-300">No nearby stations found</p>
              <p className="mt-1 text-xs text-zinc-500">
                Search another location or use GPS to refresh.
              </p>
            </div>
          )}
        </div>
        <div className="border-t border-white/[0.07] px-4 py-2.5 text-[9px] text-zinc-600">
          OpenStreetMap data · rates and power are estimates
        </div>
      </aside>

      {selectedCharger && (
        <BookingPanel
          key={`${selectedCharger.id}:${user.id}`}
          charger={selectedCharger}
          user={user}
          onClose={() => setSelectedCharger(null)}
          onConfirmed={confirmBooking}
        />
      )}
      {activePass && !selectedCharger && (
        <ActivePassCard
          key={activePass.booking.id}
          activePass={activePass}
          onClose={() => setActivePass(null)}
        />
      )}
    </div>
  );
}
