import { createHmac, timingSafeEqual } from "node:crypto";
import { BookingStatus } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  confirmedBookingResponseSchema,
  paymentVerificationRequestSchema,
} from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient } from "@/lib/razorpay";
import { confirmBookingAfterPayment } from "@/lib/confirm-booking";

function isValidRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
) {
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, paymentVerificationRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }
    if (user.role !== "DRIVER") {
      return Response.json(
        { error: "Only the booking driver can confirm payment." },
        { status: 403 },
      );
    }

    const confirmedBooking = await prisma.booking.findFirst({
      where: {
        id: parsed.data.bookingId,
        driverId: user.id,
        status: BookingStatus.CONFIRMED,
        paymentId: parsed.data.razorpay_payment_id,
        razorpayOrderId: parsed.data.razorpay_order_id,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        totalAmount: true,
        status: true,
        unlockPin: true,
        charger: { select: { title: true, exactAddress: true, description: true } },
      },
    });
    if (confirmedBooking?.unlockPin) {
      return Response.json(confirmedBookingResponseSchema.parse({
        ...confirmedBooking,
        startTime: confirmedBooking.startTime.toISOString(),
        endTime: confirmedBooking.endTime.toISOString(),
        charger: {
          title: confirmedBooking.charger.title,
          exactAddress: confirmedBooking.charger.exactAddress,
          accessInstructions: confirmedBooking.charger.description,
        },
      }));
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: parsed.data.bookingId,
        driverId: user.id,
        status: BookingStatus.PENDING,
        razorpayOrderId: parsed.data.razorpay_order_id,
      },
      select: {
        id: true,
        totalAmount: true,
      },
    });

    if (!booking) {
      return Response.json({ error: "Payment is not valid for this booking." }, {
        status: 401,
      });
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return Response.json(
        { error: "Razorpay test credentials are not configured." },
        { status: 503 },
      );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (
      !secret ||
      !isValidRazorpaySignature(
        parsed.data.razorpay_order_id,
        parsed.data.razorpay_payment_id,
        parsed.data.razorpay_signature,
        secret,
      )
    ) {
      return Response.json({ error: "Payment verification failed." }, {
        status: 401,
      });
    }

    const payment = await razorpay.client.payments.fetch(
      parsed.data.razorpay_payment_id,
    );
    const expectedAmount = Math.round(booking.totalAmount * 100);
    if (
      payment.order_id !== parsed.data.razorpay_order_id ||
      payment.amount !== expectedAmount ||
      payment.currency !== "INR" ||
      payment.status !== "captured"
    ) {
      return Response.json({ error: "Payment has not been captured." }, {
        status: 409,
      });
    }

    const result = await confirmBookingAfterPayment({
      bookingId: booking.id,
      driverId: user.id,
      razorpayOrderId: parsed.data.razorpay_order_id,
      paymentId: parsed.data.razorpay_payment_id,
    });
    if (result.kind === "unavailable") {
      return Response.json({ error: "This booking can no longer be confirmed." }, {
        status: 409,
      });
    }
    if (result.kind === "conflict") {
      return Response.json(
        { error: "This slot was booked first. Your payment is being refunded." },
        { status: 409 },
      );
    }

    return Response.json(result.booking);
  } catch (error) {
    console.error("POST /api/payments/verify failed:", error);
    return Response.json(
      { error: "Unable to verify the payment." },
      { status: 502 },
    );
  }
}
