"use client";

import { useState } from "react";
import {
  chargerRelayResponseSchema,
  bookingReservationResponseSchema,
  confirmedBookingResponseSchema,
  paymentOrderResponseSchema,
  sandboxAvailabilityResponseSchema,
  type AuthUser,
  type ConfirmedBooking,
} from "@/lib/api-schemas";
import { parseApiResponse } from "@/lib/api-client";
import type { PublicCharger } from "@/lib/public-charger";

type BookingPanelProps = {
  charger: PublicCharger;
  user: AuthUser | null;
  onClose: () => void;
};

type Duration = 1 | 2 | 3;

type RazorpayPaymentDetails = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (payment: RazorpayPaymentDetails) => void;
  modal: { ondismiss: () => void };
};

type RazorpayCheckoutInstance = {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => {
        razorpayScriptPromise = null;
        reject(new Error("Could not load Razorpay Checkout."));
      };
      document.body.append(script);
    });
  }
  return razorpayScriptPromise;
}

const durationOptions: Duration[] = [1, 2, 3];
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function BookingPanel({
  charger,
  user,
  onClose,
}: BookingPanelProps) {
  const [duration, setDuration] = useState<Duration>(1);
  const [booking, setBooking] = useState<ConfirmedBooking | null>(null);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [sandboxAvailable, setSandboxAvailable] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [relayMessage, setRelayMessage] = useState<string | null>(null);
  const [relayPowered, setRelayPowered] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isTogglingRelay, setIsTogglingRelay] = useState(false);
  const estimatedTotal = charger.pricePerHour * duration;

  async function bookSlot() {
    setIsBooking(true);
    setBookingError(null);
    setRelayMessage(null);

    try {
      let bookingId = pendingBookingId;
      if (!bookingId) {
        const start = new Date();
        const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
        const reservationResponse = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chargerId: charger.id,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
          }),
        });
        const reservation = await parseApiResponse(
          reservationResponse,
          bookingReservationResponseSchema,
        );
        bookingId = reservation.id;
        setPendingBookingId(bookingId);
      }

      const orderResponse = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (orderResponse.status === 503) {
        const sandboxResponse = await fetch("/api/payments/sandbox", {
          cache: "no-store",
        });
        const sandboxStatus = await parseApiResponse(
          sandboxResponse,
          sandboxAvailabilityResponseSchema,
        );
        if (sandboxStatus.enabled) {
          setSandboxAvailable(true);
          return;
        }
      }
      const order = await parseApiResponse(
        orderResponse,
        paymentOrderResponseSchema,
      );
      await loadRazorpayCheckout();
      const RazorpayCheckout = window.Razorpay;
      if (!RazorpayCheckout) {
        throw new Error("Razorpay Checkout is unavailable.");
      }

      const confirmedBooking = await new Promise<ConfirmedBooking>(
        (resolve, reject) => {
          let settled = false;
          const checkout = new RazorpayCheckout({
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            name: "ChargeShare Bengaluru",
            description: `${charger.title} · ${duration} hour session`,
            order_id: order.orderId,
            handler: (payment) => {
              if (settled) return;
              settled = true;
              void (async () => {
                try {
                  const verificationResponse = await fetch(
                    "/api/payments/verify",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        bookingId,
                        ...payment,
                      }),
                    },
                  );
                  resolve(
                    await parseApiResponse(
                      verificationResponse,
                      confirmedBookingResponseSchema,
                    ),
                  );
                } catch (error) {
                  reject(error);
                }
              })();
            },
            modal: {
              ondismiss: () => {
                if (settled) return;
                settled = true;
                reject(
                  new Error(
                    "Payment was cancelled. You can retry within 15 minutes.",
                  ),
                );
              },
            },
          });
          checkout.open();
        },
      );
      setBooking(confirmedBooking);
      setPendingBookingId(null);
      setSandboxAvailable(false);
    } catch (error) {
      setBookingError(
        error instanceof Error ? error.message : "Unable to create booking.",
      );
    } finally {
      setIsBooking(false);
    }
  }

  async function simulateSandboxPayment() {
    if (!pendingBookingId) return;

    setIsBooking(true);
    setBookingError(null);
    setRelayMessage(null);

    try {
      const response = await fetch("/api/payments/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: pendingBookingId }),
      });
      const result = await parseApiResponse(
        response,
        confirmedBookingResponseSchema,
      );
      setBooking(result);
      setPendingBookingId(null);
      setSandboxAvailable(false);
    } catch (error) {
      setBookingError(
        error instanceof Error
          ? error.message
          : "Unable to confirm the sandbox booking.",
      );
    } finally {
      setIsBooking(false);
    }
  }

  async function toggleRelay() {
    if (!booking) return;

    if (relayPowered) {
      setRelayPowered(false);
      setRelayMessage("Simulated relay returned to standby.");
      return;
    }

    setIsTogglingRelay(true);
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
      setRelayPowered(result.relayStatus === "POWER_ON");
      setRelayMessage(
        `Relay status: ${result.relayStatus} · Booking ${result.bookingId}`,
      );
    } catch (error) {
      setBookingError(
        error instanceof Error ? error.message : "Unable to test the relay.",
      );
    } finally {
      setIsTogglingRelay(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1500] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close booking drawer"
      />
      <section
        aria-labelledby="booking-drawer-title"
        aria-modal="true"
        className="booking-drawer relative max-h-[92svh] w-full overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#14181F] p-5 shadow-2xl shadow-black/70 sm:max-w-xl sm:rounded-[28px] sm:p-7"
        role="dialog"
      >
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-white/20 sm:hidden" />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lime-300">
              {booking ? "Your charge is locked in" : "Instant reservation"}
            </p>
            <h2
              id="booking-drawer-title"
              className="mt-2 text-2xl font-bold tracking-tight text-white"
            >
              {charger.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {charger.powerKw} kW <span className="px-1">·</span>{" "}
              {charger.connectorType.replace("_", " ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking details"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        {!booking ? (
          <>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-200">
                  Choose your session
                </p>
                <span className="text-xs text-zinc-500">Starts now</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {durationOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDuration(option)}
                    aria-pressed={duration === option}
                    disabled={Boolean(pendingBookingId)}
                    className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                      duration === option
                        ? "border-lime-300/70 bg-lime-300/10 text-lime-200 shadow-[inset_0_0_20px_rgba(163,255,18,0.06)]"
                        : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {option} hour{option > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs text-zinc-500">
                    {inrFormatter.format(charger.pricePerHour)} / hour
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">Estimated total</p>
                </div>
                <p className="text-2xl font-extrabold tracking-tight text-white">
                  {inrFormatter.format(estimatedTotal)}
                </p>
              </div>
              <p className="mt-2 text-right text-[11px] text-zinc-500">
                Final total is calculated securely on the server.
              </p>
            </div>

            {bookingError && (
              <p className="mt-4 text-sm text-rose-300" role="alert">
                {bookingError}
              </p>
            )}

            {sandboxAvailable ? (
              <button
                type="button"
                onClick={simulateSandboxPayment}
                disabled={!user || user.role !== "DRIVER" || isBooking}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#1ED760] px-5 py-4 text-sm font-extrabold text-zinc-950 shadow-[0_8px_36px_rgba(30,215,96,0.2)] transition hover:bg-[#A3FF12] hover:shadow-[0_8px_44px_rgba(163,255,18,0.24)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isBooking
                  ? "Confirming sandbox booking…"
                  : "Simulate Test Payment (Sandbox Mode)"}
              </button>
            ) : (
              <button
                type="button"
                onClick={bookSlot}
                disabled={!user || user.role !== "DRIVER" || isBooking}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#1ED760] px-5 py-4 text-sm font-extrabold text-zinc-950 shadow-[0_8px_36px_rgba(30,215,96,0.2)] transition hover:bg-[#A3FF12] hover:shadow-[0_8px_44px_rgba(163,255,18,0.24)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="size-4"
                  fill="currentColor"
                >
                  <path d="M11.16 1.7 4.7 10.1a.75.75 0 0 0 .6 1.2h4.02l-.48 6.99a.25.25 0 0 0 .45.17l6.03-8.8a.75.75 0 0 0-.62-1.17h-3.89l.8-6.57a.25.25 0 0 0-.45-.2Z" />
                </svg>
                {isBooking
                  ? "Opening secure checkout…"
                  : pendingBookingId
                    ? `Retry Razorpay payment · ${inrFormatter.format(estimatedTotal)}`
                    : `Instant Book & Pay · ${inrFormatter.format(estimatedTotal)}`}
              </button>
            )}
            {!user && (
              <p className="mt-3 text-center text-xs text-zinc-500">
                Log in from the top bar to book this charger.
              </p>
            )}
            {user?.role === "HOST" && (
              <p className="mt-3 text-center text-xs text-zinc-500">
                Host accounts can’t create driver bookings.
              </p>
            )}
            <p className="mt-4 text-center text-[11px] text-zinc-600">
              {sandboxAvailable
                ? "Local-only sandbox simulation · no payment is processed"
                : "Secure payment via Razorpay test mode"}
            </p>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-lime-300/20 bg-lime-300/[0.06] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-300">
                    Booking confirmed
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-white">
                    {inrFormatter.format(booking.totalAmount)}
                  </p>
                </div>
                <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-xs font-semibold text-lime-200">
                  {duration}h session
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Exact home address
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-100">
                  {booking.charger.exactAddress}
                </p>
              </div>
              <div className="min-w-36 rounded-2xl border border-white/10 bg-black/20 p-4 sm:text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Unlock PIN
                </p>
                <p className="mt-2 font-mono text-2xl font-bold tracking-[0.22em] text-lime-200">
                  {booking.unlockPin}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div>
                <p className="font-semibold text-white">Smart charger relay</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Test the home charger connection
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={relayPowered}
                aria-label="Test smart charger relay power"
                onClick={toggleRelay}
                disabled={isTogglingRelay}
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
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {isTogglingRelay
                  ? "Checking relay…"
                  : relayPowered
                    ? "Power on"
                    : "Standby"}
              </span>
              <span
                className={`flex items-center gap-2 ${
                  relayPowered ? "text-lime-300" : "text-zinc-500"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    relayPowered ? "bg-lime-300 shadow-[0_0_8px_#A3FF12]" : "bg-zinc-600"
                  }`}
                />
                {relayPowered ? "Connected" : "Ready to test"}
              </span>
            </div>
            {relayMessage && (
              <p className="text-sm text-lime-300" role="status">
                {relayMessage}
              </p>
            )}
            {bookingError && (
              <p className="text-sm text-rose-300" role="alert">
                {bookingError}
              </p>
            )}
            <p className="text-[11px] leading-5 text-zinc-600">
              Relay power-off is simulated locally; a real charger relay would
              need a dedicated off command.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
