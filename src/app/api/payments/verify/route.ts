import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { BookingStatus, Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  confirmedBookingResponseSchema,
  paymentVerificationRequestSchema,
} from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient } from "@/lib/razorpay";

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

function confirmedBookingPayload(booking: {
  id: string;
  startTime: Date | string;
  endTime: Date | string;
  totalAmount: number;
  status: BookingStatus;
  unlockPin: string | null;
  charger: { title: string; exactAddress: string };
}) {
  return confirmedBookingResponseSchema.parse({
    id: booking.id,
    startTime:
      booking.startTime instanceof Date
        ? booking.startTime.toISOString()
        : booking.startTime,
    endTime:
      booking.endTime instanceof Date
        ? booking.endTime.toISOString()
        : booking.endTime,
    totalAmount: booking.totalAmount,
    status: booking.status,
    unlockPin: booking.unlockPin,
    charger: booking.charger,
  });
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
        charger: { select: { title: true, exactAddress: true } },
      },
    });
    if (confirmedBooking?.unlockPin) {
      return Response.json(confirmedBookingPayload(confirmedBooking));
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
        chargerId: true,
        startTime: true,
        endTime: true,
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

    let result;
    try {
      result = await prisma.$transaction(
        async (transaction) => {
          const currentBooking = await transaction.booking.findFirst({
            where: {
              id: booking.id,
              driverId: user.id,
              status: BookingStatus.PENDING,
              razorpayOrderId: parsed.data.razorpay_order_id,
            },
            select: { id: true },
          });

          if (!currentBooking) return { kind: "unavailable" as const };

          const overlappingBooking = await transaction.booking.findFirst({
            where: {
              chargerId: booking.chargerId,
              id: { not: booking.id },
              status: { in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE] },
              startTime: { lt: booking.endTime },
              endTime: { gt: booking.startTime },
            },
            select: { id: true },
          });

          if (overlappingBooking) return { kind: "conflict" as const };

          const unlockPin = randomInt(0, 1_000_000).toString().padStart(6, "0");
          const confirmedBooking = await transaction.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.CONFIRMED,
              paymentId: parsed.data.razorpay_payment_id,
              unlockPin,
            },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              totalAmount: true,
              status: true,
              unlockPin: true,
              charger: { select: { title: true, exactAddress: true } },
            },
          });

          return {
            kind: "confirmed" as const,
            booking: {
              id: confirmedBooking.id,
              startTime: confirmedBooking.startTime.toISOString(),
              endTime: confirmedBooking.endTime.toISOString(),
              totalAmount: confirmedBooking.totalAmount,
              status: confirmedBooking.status,
              unlockPin: confirmedBooking.unlockPin,
              charger: confirmedBooking.charger,
            },
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        const alreadyConfirmed = await prisma.booking.findFirst({
          where: {
            id: booking.id,
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
            charger: { select: { title: true, exactAddress: true } },
          },
        });
        if (alreadyConfirmed?.unlockPin) {
          return Response.json(confirmedBookingPayload(alreadyConfirmed));
        }

        await razorpay.client.payments.refund(
          parsed.data.razorpay_payment_id,
          { amount: expectedAmount, notes: { booking_id: booking.id } },
        );
        return Response.json(
          { error: "The slot was booked first. Your payment is being refunded." },
          { status: 409 },
        );
      }
      throw error;
    }

    if (result.kind === "unavailable") {
      return Response.json({ error: "This booking can no longer be confirmed." }, {
        status: 409,
      });
    }
    if (result.kind === "conflict") {
      await razorpay.client.payments.refund(
        parsed.data.razorpay_payment_id,
        { amount: expectedAmount, notes: { booking_id: booking.id } },
      );
      return Response.json(
        { error: "This slot was booked first. Your payment is being refunded." },
        { status: 409 },
      );
    }

    return Response.json(confirmedBookingPayload(result.booking));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return Response.json(
        { error: "This charger already has a booking for that time." },
        { status: 409 },
      );
    }

    console.error("POST /api/payments/verify failed:", error);
    return Response.json(
      { error: "Unable to verify the payment." },
      { status: 502 },
    );
  }
}
