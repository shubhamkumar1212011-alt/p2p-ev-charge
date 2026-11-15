"use client";

import { useState } from "react";
import {
  chargerRelayResponseSchema,
  confirmedBookingResponseSchema,
  type AuthUser,
  type ConfirmedBooking,
} from "@/lib/api-schemas";
import { parseApiResponse } from "@/lib/api-client";
import type { PublicCharger } from "@/lib/public-charger";

type BookingPanelProps = {
  charger: PublicCharger;
  user: AuthUser | null;
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function BookingPanel({ charger, user }: BookingPanelProps) {
  const [booking, setBooking] = useState<ConfirmedBooking | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [relayMessage, setRelayMessage] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  async function bookOneHour() {
    setIsBooking(true);
    setBookingError(null);
    setRelayMessage(null);

    try {
      const start = new Date();
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargerId: charger.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      });
      const result = await parseApiResponse(
        response,
        confirmedBookingResponseSchema,
      );
      setBooking(result);
    } catch (error) {
      setBookingError(
        error instanceof Error ? error.message : "Unable to create booking.",
      );
    } finally {
      setIsBooking(false);
    }
  }

  async function testUnlock() {
    if (!booking) return;

    setIsUnlocking(true);
    setBookingError(null);
    setRelayMessage(null);

    try {
      const response = await fetch("/api/charger/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargerId: charger.id,
          unlockPin: booking.unlockPin,
        }),
      });
      const result = await parseApiResponse(
        response,
        chargerRelayResponseSchema,
      );
      setRelayMessage(
        `Relay status: ${result.relayStatus} · Booking ${result.bookingId}`,
      );
    } catch (error) {
      setBookingError(
        error instanceof Error ? error.message : "Unable to unlock charger.",
      );
    } finally {
      setIsUnlocking(false);
    }
  }

  return (
    <section
      aria-labelledby="selected-charger-heading"
      className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/70 p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-400">
            Selected charger
          </p>
          <h3
            id="selected-charger-heading"
            className="mt-1 text-xl font-semibold text-white"
          >
            {charger.title}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            {charger.powerKw} kW · {charger.connectorType.replace("_", " ")}
          </p>
          <p className="mt-2 text-sm text-zinc-200">
            {inrFormatter.format(charger.pricePerHour)} per hour
          </p>
        </div>
        <button
          type="button"
          onClick={bookOneHour}
          disabled={!user || user.role !== "DRIVER" || isBooking || !!booking}
          className="shrink-0 rounded-lg bg-emerald-400 px-4 py-2.5 font-medium text-zinc-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {booking
            ? "Booking confirmed"
            : isBooking
              ? "Booking…"
              : "Book 1 hour"}
        </button>
      </div>

      {!user && (
        <p className="mt-4 text-sm text-zinc-400">
          Log in or sign up as a driver to book this charger.
        </p>
      )}
      {user?.role === "HOST" && (
        <p className="mt-4 text-sm text-zinc-400">
          Host accounts cannot create driver bookings.
        </p>
      )}

      {bookingError && (
        <p className="mt-4 text-sm text-red-300" role="alert">
          {bookingError}
        </p>
      )}

      {booking && (
        <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-4">
          <p className="font-medium text-emerald-300">
            Booking confirmed · {inrFormatter.format(booking.totalAmount)} total
          </p>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-400">Exact address</dt>
              <dd className="mt-1 text-zinc-100">{booking.charger.exactAddress}</dd>
            </div>
            <div>
              <dt className="text-zinc-400">6-digit unlock PIN</dt>
              <dd className="mt-1 font-mono text-lg tracking-[0.2em] text-white">
                {booking.unlockPin}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={testUnlock}
            disabled={isUnlocking}
            className="mt-4 rounded-lg border border-emerald-300/40 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-300/10 disabled:opacity-50"
          >
            {isUnlocking ? "Checking relay…" : "Test charger unlock"}
          </button>
          {relayMessage && (
            <p className="mt-3 text-sm text-emerald-300" role="status">
              {relayMessage}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
