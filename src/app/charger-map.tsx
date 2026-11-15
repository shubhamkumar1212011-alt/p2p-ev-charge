"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import AuthPanel from "./auth-panel";
import BookingPanel from "./booking-panel";
import {
  type AuthUser,
} from "@/lib/api-schemas";
import {
  connectorFilterSchema,
  connectorLabels,
  connectorTypes,
  publicChargersSchema,
  type ConnectorFilter,
  type PublicCharger,
} from "@/lib/public-charger";

const bengaluruCenter: [number, number] = [12.9716, 77.5946];
const simulatedEvLocation: [number, number] = [12.9668, 77.6068];

const chargerIcon = L.divIcon({
  className: "",
  html: '<span class="charger-map-pin" aria-hidden="true"></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const evIcon = L.divIcon({
  className: "",
  html: '<span class="ev-map-pin" aria-hidden="true"></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function ChargerMap() {
  const [chargers, setChargers] = useState<PublicCharger[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedCharger, setSelectedCharger] =
    useState<PublicCharger | null>(null);
  const [selectedConnector, setSelectedConnector] =
    useState<ConnectorFilter>("ALL");
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

  const filteredChargers =
    selectedConnector === "ALL"
      ? chargers
      : chargers.filter(
          (charger) => charger.connectorType === selectedConnector,
        );

  return (
    <>
      <AuthPanel user={user} onUserChange={setUser} />
      <section aria-labelledby="map-heading" className="w-full">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="map-heading" className="text-xl font-semibold text-white">
              Chargers near you
            </h2>
            <p className="mt-1 text-sm text-zinc-400" aria-live="polite">
              {isLoading
                ? "Finding available chargers…"
                : `${filteredChargers.length} available ${
                    filteredChargers.length === 1 ? "charger" : "chargers"
                  }`}
            </p>
          </div>
          <label className="flex flex-col gap-2 text-sm text-zinc-300 sm:min-w-56">
            Filter by connector
            <select
              className="rounded-lg border border-white/15 bg-zinc-900 px-3 py-2.5 text-white outline-none focus:border-emerald-400"
              value={selectedConnector}
              onChange={(event) => {
                const result = connectorFilterSchema.safeParse(
                  event.currentTarget.value,
                );
                if (result.success) {
                  setSelectedConnector(result.data);
                  setSelectedCharger(null);
                }
              }}
              aria-label="Filter chargers by connector type"
            >
              <option value="ALL">All connectors</option>
              {connectorTypes.map((connectorType) => (
                <option key={connectorType} value={connectorType}>
                  {connectorLabels[connectorType]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="relative h-[min(68vh,680px)] min-h-[420px] overflow-hidden rounded-2xl border border-white/10">
          <MapContainer
            center={bengaluruCenter}
            zoom={12}
            scrollWheelZoom
            className="h-full w-full"
            aria-label="Interactive map of available EV chargers in Bengaluru"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker position={simulatedEvLocation} icon={evIcon}>
              <Popup>
                <strong>My EV Location</strong>
                <br />
                Simulated location in Bengaluru
              </Popup>
            </Marker>

            {filteredChargers.map((charger) => (
              <Marker
                key={charger.id}
                position={[charger.approxLat, charger.approxLng]}
                icon={chargerIcon}
              >
                <Popup>
                  <div className="min-w-44 space-y-1">
                    <h3 className="font-semibold">{charger.title}</h3>
                    <p>{connectorLabels[charger.connectorType]}</p>
                    <p>{charger.powerKw} kW</p>
                    <p className="font-medium">
                      {inrFormatter.format(charger.pricePerHour)} / hour
                    </p>
                    <p className="text-emerald-700">Available</p>
                    <button
                      type="button"
                      onClick={() => setSelectedCharger(charger)}
                      className="mt-1 rounded bg-emerald-600 px-2 py-1 text-white"
                    >
                      Select charger
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {errorMessage && (
            <p
              className="absolute inset-x-4 top-4 z-[1000] rounded-lg bg-red-950/95 px-4 py-3 text-sm text-red-100"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {!isLoading && !errorMessage && filteredChargers.length === 0 && (
            <p className="absolute inset-x-4 top-4 z-[1000] rounded-lg bg-zinc-950/90 px-4 py-3 text-sm text-zinc-200">
              No available chargers match this connector.
            </p>
          )}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Charger pins show approximate locations. Map data © OpenStreetMap
          contributors.
        </p>
      </section>

      {selectedCharger && (
        <BookingPanel
          key={`${selectedCharger.id}:${user?.id ?? "signed-out"}`}
          charger={selectedCharger}
          user={user}
        />
      )}
    </>
  );
}
