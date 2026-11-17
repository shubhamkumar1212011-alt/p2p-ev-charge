"use client";

import { useState } from "react";
import {
  bookingReservationResponseSchema,
  confirmedBookingResponseSchema,
  paymentOrderResponseSchema,
  sandboxAvailabilityResponseSchema,
  type AuthUser,
  type ConfirmedBooking,
} from "@/lib/api-schemas";
import { parseApiResponse } from "@/lib/api-client";
import type { PublicCharger } from "@/lib/public-charger";
import NearbyChillPanel from "./nearby-chill-panel";

type BookingPanelProps = {
  charger: PublicCharger;
  user: AuthUser;
  onClose: () => void;
  onConfirmed: (booking: ConfirmedBooking) => void;
};

type Duration = 1 | 2 | 3;
type PaymentMethod = "UPI QR" | "Card" | "Wallet";
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
const paymentMethods: PaymentMethod[] = ["UPI QR", "Card", "Wallet"];
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function SandboxQr() {
  return (
    <div
      aria-label="Simulated UPI QR code"
      className="sandbox-qr mx-auto grid size-32 grid-cols-7 gap-1 rounded-xl bg-white p-3"
    >
      {Array.from({ length: 49 }, (_, index) => (
        <span
          key={index}
          className={`rounded-[1px] ${
            (index * 7 + Math.floor(index / 3)) % 4 === 0 ||
            [0, 1, 2, 7, 9, 14, 21, 28, 35, 42, 43, 44, 46, 47, 48].includes(index)
              ? "bg-zinc-950"
              : "bg-white"
          }`}
        />
      ))}
    </div>
  );
}

export default function BookingPanel({
  charger,
  user,
  onClose,
  onConfirmed,
}: BookingPanelProps) {
  const [duration, setDuration] = useState<Duration>(1);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [sandboxAvailable, setSandboxAvailable] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI QR");
  const [isBooking, setIsBooking] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const estimatedTotal = charger.pricePerHour * duration;
  const checkoutTotal = serverTotal ?? estimatedTotal;

  async function bookSlot() {
    setIsBooking(true);
    setBookingError(null);

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
        setServerTotal(reservation.totalAmount);
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
          setCheckoutOpen(true);
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
            name: "ChargeShare",
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
                      body: JSON.stringify({ bookingId, ...payment }),
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
                reject(new Error("Payment was cancelled. You can retry shortly."));
              },
            },
          });
          checkout.open();
        },
      );
      onConfirmed(confirmedBooking);
    } catch (error) {
      setBookingError(
        error instanceof Error ? error.message : "Unable to start checkout.",
      );
    } finally {
      setIsBooking(false);
    }
  }

  async function simulateSandboxPayment() {
    if (!pendingBookingId) return;

    setIsVerifyingPayment(true);
    setBookingError(null);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1_500));
      const response = await fetch("/api/payments/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: pendingBookingId }),
      });
      const booking = await parseApiResponse(
        response,
        confirmedBookingResponseSchema,
      );
      setCheckoutOpen(false);
      onConfirmed(booking);
    } catch (error) {
      setBookingError(
        error instanceof Error
          ? error.message
          : "Unable to verify the sandbox payment.",
      );
    } finally {
      setIsVerifyingPayment(false);
    }
  }

  return (
    <section className="station-booking-panel absolute bottom-5 right-5 z-[1300] flex max-h-[calc(100vh-110px)] w-[420px] max-w-[calc(100%-2.5rem)] flex-col overflow-y-auto rounded-3xl border border-white/10 bg-[#0B0D10]/90 p-4 text-white shadow-2xl shadow-black/50 backdrop-blur-xl max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-h-[82svh] max-sm:w-auto max-sm:max-w-none max-sm:rounded-b-none max-sm:rounded-t-3xl max-sm:p-5">
      {checkoutOpen && sandboxAvailable && (
        <div
          className="absolute inset-0 z-30 overflow-y-auto bg-[#0B0D10]/95 p-4 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sandbox-checkout-title"
        >
          <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center">
            <div className="rounded-3xl border border-white/10 bg-[#14181F] p-5 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime-300">
                    ChargeShare sandbox
                  </p>
                  <h2
                    id="sandbox-checkout-title"
                    className="mt-1 text-xl font-bold text-white"
                  >
                    Secure checkout
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(false)}
                  disabled={isVerifyingPayment}
                  aria-label="Close checkout"
                  className="grid size-8 place-items-center rounded-full border border-white/10 text-zinc-400 hover:text-white disabled:opacity-40"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/25 p-3">
                <p className="truncate text-sm font-semibold text-white">
                  {charger.title}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>{duration} hour session · estimated</span>
                  <span className="font-bold text-lime-200">
                    {inrFormatter.format(checkoutTotal)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-black/30 p-1">
                {paymentMethods.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    aria-pressed={paymentMethod === method}
                    className={`rounded-lg px-2 py-2 text-[10px] font-bold transition ${
                      paymentMethod === method
                        ? "bg-lime-300 text-zinc-950"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex min-h-40 flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-black/20 p-4 text-center">
                {paymentMethod === "UPI QR" ? (
                  <>
                    <SandboxQr />
                    <p className="mt-2 text-[10px] text-zinc-500">
                      Sandbox UPI QR · no bank transfer
                    </p>
                  </>
                ) : paymentMethod === "Card" ? (
                  <div className="w-full rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800 to-zinc-950 p-4 text-left">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                      Test card
                    </p>
                    <p className="mt-5 font-mono text-sm tracking-[0.18em] text-white">
                      •••• •••• •••• 4242
                    </p>
                    <p className="mt-2 text-[9px] text-zinc-500">
                      Sandbox only · no card details collected
                    </p>
                  </div>
                ) : (
                  <div className="w-full space-y-2">
                    {["Paytm Wallet", "Amazon Pay", "Other test wallet"].map(
                      (wallet) => (
                        <div
                          key={wallet}
                          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-xs text-zinc-300"
                        >
                          {wallet}
                        </div>
                      ),
                    )}
                    <p className="text-[10px] text-zinc-500">
                      Wallet options are simulated
                    </p>
                  </div>
                )}
              </div>

              {bookingError && (
                <p className="mt-3 text-xs text-rose-300" role="alert">
                  {bookingError}
                </p>
              )}
              <button
                type="button"
                onClick={simulateSandboxPayment}
                disabled={isVerifyingPayment}
                className="mt-4 flex w-full items-center justify-center rounded-full bg-[#1ED760] px-4 py-3.5 text-sm font-extrabold text-zinc-950 transition hover:bg-[#A3FF12] disabled:cursor-wait disabled:opacity-70"
              >
                {isVerifyingPayment ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-zinc-950/25 border-t-zinc-950" />
                    Verifying Payment with Gateway...
                  </span>
                ) : (
                  `Pay ${inrFormatter.format(checkoutTotal)}`
                )}
              </button>
              <p className="mt-3 text-center text-[9px] text-zinc-600">
                Development sandbox · no real payment is processed
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-300">
            Station reservation
          </p>
          <h2 className="mt-1 text-lg font-bold leading-snug text-white">
            {charger.title}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {charger.stationType === "FUEL"
              ? "Fuel / EV stop · estimated specs"
              : charger.connectorType.replace("_", " ")}
            {" · "}
            {charger.powerKw} kW est.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to nearby stations"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-400 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3.5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-200">Choose duration</p>
          <span className="text-[10px] text-zinc-500">Starts now</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {durationOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDuration(option)}
              aria-pressed={duration === option}
              disabled={Boolean(pendingBookingId)}
              className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition disabled:opacity-50 ${
                duration === option
                  ? "border-lime-300/70 bg-lime-300/10 text-lime-200"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
              }`}
            >
              {option} hour{option > 1 ? "s" : ""}
            </button>
          ))}
        </div>
        <NearbyChillPanel charger={charger} isBooked={Boolean(pendingBookingId)} />
        <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
          <div>
            <p className="text-[10px] text-zinc-500">
              {inrFormatter.format(charger.pricePerHour)} / hour · estimate
            </p>
            <p className="mt-1 text-xs text-zinc-300">Server-calculated total</p>
          </div>
          <p className="text-xl font-extrabold text-white">
            {inrFormatter.format(serverTotal ?? estimatedTotal)}
          </p>
        </div>
      </div>

      {bookingError && !checkoutOpen && (
        <p className="mt-3 text-xs text-rose-300" role="alert">
          {bookingError}
        </p>
      )}
      {sandboxAvailable ? (
        !checkoutOpen && (
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            disabled={isVerifyingPayment}
            className="mt-4 flex w-full items-center justify-center rounded-full bg-[#1ED760] px-4 py-3.5 text-sm font-extrabold text-zinc-950 transition hover:bg-[#A3FF12] disabled:opacity-50"
          >
            Reopen Sandbox Checkout · {inrFormatter.format(checkoutTotal)}
          </button>
        )
      ) : (
        <button
          type="button"
          onClick={bookSlot}
          disabled={isBooking}
          className="mt-4 flex w-full items-center justify-center rounded-full bg-[#1ED760] px-4 py-3.5 text-sm font-extrabold text-zinc-950 shadow-[0_8px_30px_rgba(30,215,96,0.18)] transition hover:bg-[#A3FF12] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isBooking
            ? "Opening secure checkout…"
            : `Proceed to Pay · ${inrFormatter.format(serverTotal ?? estimatedTotal)}`}
        </button>
      )}
      {false && (
        <p className="mt-2 text-center text-[10px] text-zinc-500">
          Host accounts can’t create driver bookings.
        </p>
      )}
      <p className="mt-3 text-center text-[9px] text-zinc-600">
        Final amount is calculated by the server before checkout.
      </p>
    </section>
  );
}
