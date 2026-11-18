"use client";

import { useState } from "react";
import { X, Zap, MapPin, Check, Loader2 } from "lucide-react";
import {
  connectorLabels,
  connectorTypes,
  hostAmenityOptions,
  type ConnectorType,
  type PublicCharger,
} from "@/lib/public-charger";

type HostChargerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultLat: number;
  defaultLng: number;
  onCreated: (charger: PublicCharger) => void;
};

export default function HostChargerModal({
  isOpen,
  onClose,
  defaultLat,
  defaultLng,
  onCreated,
}: HostChargerModalProps) {
  const [title, setTitle] = useState("");
  const [exactAddress, setExactAddress] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState(defaultLat.toFixed(6));
  const [lng, setLng] = useState(defaultLng.toFixed(6));
  const [connectorType, setConnectorType] = useState<ConnectorType>("TYPE_2");
  const [powerKw, setPowerKw] = useState("7.4");
  const [pricePerHour, setPricePerHour] = useState("150");
  const [amenities, setAmenities] = useState<string[]>(["Covered Parking"]);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function toggleAmenity(item: string) {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item],
    );
  }

  function handleUseCurrentGps() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError("Unable to fetch GPS location. You can use the active map center or type coordinates.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/chargers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          exactAddress,
          description: description.trim() || undefined,
          approxLat: parseFloat(lat),
          approxLng: parseFloat(lng),
          connectorType,
          powerKw: parseFloat(powerKw),
          pricePerHour: parseFloat(pricePerHour),
          amenities,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error || "Failed to publish charger.");
        setSubmitting(false);
        return;
      }

      onCreated(payload.charger);
      setTitle("");
      setExactAddress("");
      setDescription("");
      onClose();
    } catch {
      setError("Network error while publishing charger.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">List Your EV Charger</h2>
              <p className="text-xs text-slate-400">
                Publish your residential or commercial charger to the live P2P network
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Charger Station Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., GreenPark Villa 7.4kW AC Point"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Complete Street Address (Revealed after booking payment) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., #42, 4th Cross, JP Nagar 6th Phase, Bengaluru"
              value={exactAddress}
              onChange={(e) => setExactAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Coordinates */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" /> Station Coordinates
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLat(defaultLat.toFixed(6));
                    setLng(defaultLng.toFixed(6));
                  }}
                  className="text-[11px] font-medium text-slate-300 hover:text-white underline"
                >
                  Use Map Pin
                </button>
                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  disabled={locating}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                >
                  {locating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Use Live GPS"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">Latitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">Longitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Hardware Specs */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Connector</label>
              <select
                value={connectorType}
                onChange={(e) => setConnectorType(e.target.value as ConnectorType)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                {connectorTypes.map((ct) => (
                  <option key={ct} value={ct}>
                    {connectorLabels[ct]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Power (kW)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="350"
                required
                value={powerKw}
                onChange={(e) => setPowerKw(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tariff (₹/hr)</label>
              <input
                type="number"
                min="10"
                max="5000"
                required
                value={pricePerHour}
                onChange={(e) => setPricePerHour(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Verified On-Site Utilities */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              On-Site Utilities Available to Drivers
            </label>
            <div className="flex flex-wrap gap-1.5">
              {hostAmenityOptions.map((item) => {
                const active = amenities.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAmenity(item)}
                    className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-200"
                        : "border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {active && <Check className="h-3 w-3 text-emerald-400" />}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Driver access instructions (shown only to drivers after payment)
            </label>
            <input
              type="text"
              placeholder="e.g., Covered driveway on left side; security guard has gate key"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Publishing to Live Network...
              </>
            ) : (
              "Publish Charger Live"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
