import { getAuthenticatedUser } from "@/lib/auth";
import {
  paymentOrderRequestSchema,
  paymentOrderResponseSchema,
} from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient } from "@/lib/razorpay";

const paymentWindowMs = 15 * 60 * 1000;

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, paymentOrderRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }
    if (user.role !== "DRIVER") {
      return Response.json(
        { error: "Only driver accounts can pay for bookings." },
        { status: 403 },
      );
    }

    const createdAfter = new Date(Date.now() - paymentWindowMs);
    const booking = await prisma.booking.findFirst({
      where: {
        id: parsed.data.bookingId,
        driverId: user.id,
        status: "PENDING",
        createdAt: { gte: createdAfter },
      },
      select: {
        id: true,
        totalAmount: true,
        razorpayOrderId: true,
      },
    });

    if (!booking) {
      return Response.json(
        { error: "This booking is unavailable or its payment window expired." },
        { status: 409 },
      );
    }

    const amount = Math.round(booking.totalAmount * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return Response.json(
        { error: "This booking has an invalid payment amount." },
        { status: 400 },
      );
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return Response.json(
        { error: "Razorpay test credentials are not configured." },
        { status: 503 },
      );
    }

    if (booking.razorpayOrderId) {
      return Response.json(
        paymentOrderResponseSchema.parse({
          bookingId: booking.id,
          orderId: booking.razorpayOrderId,
          keyId: razorpay.keyId,
          amount,
          currency: "INR",
        }),
      );
    }

    const order = await razorpay.client.orders.create({
      amount,
      currency: "INR",
      receipt: booking.id,
    });
    const updated = await prisma.booking.updateMany({
      where: {
        id: booking.id,
        driverId: user.id,
        status: "PENDING",
        razorpayOrderId: null,
        createdAt: { gte: createdAfter },
      },
      data: { razorpayOrderId: order.id },
    });

    if (updated.count !== 1) {
      const currentBooking = await prisma.booking.findFirst({
        where: {
          id: booking.id,
          driverId: user.id,
          status: "PENDING",
          createdAt: { gte: createdAfter },
        },
        select: { razorpayOrderId: true },
      });

      if (!currentBooking?.razorpayOrderId) {
        return Response.json(
          { error: "This booking can no longer be paid." },
          { status: 409 },
        );
      }

      return Response.json(
        paymentOrderResponseSchema.parse({
          bookingId: booking.id,
          orderId: currentBooking.razorpayOrderId,
          keyId: razorpay.keyId,
          amount,
          currency: "INR",
        }),
      );
    }

    return Response.json(
      paymentOrderResponseSchema.parse({
        bookingId: booking.id,
        orderId: order.id,
        keyId: razorpay.keyId,
        amount,
        currency: "INR",
      }),
    );
  } catch (error) {
    console.error("POST /api/payments/order failed:", error);
    return Response.json(
      { error: "Unable to initialize the payment." },
      { status: 502 },
    );
  }
}
