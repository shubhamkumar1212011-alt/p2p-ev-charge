import { createHmac, timingSafeEqual } from "node:crypto";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { confirmBookingAfterPayment } from "@/lib/confirm-booking";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nestedEntity(
  value: unknown,
  collection: string,
): JsonRecord | undefined {
  if (!isRecord(value) || !isRecord(value[collection])) return undefined;
  const entity = value[collection].entity;
  return isRecord(entity) ? entity : undefined;
}

function isValidSignature(rawBody: string, signature: string, secret: string) {
  if (!/^[\da-f]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return Response.json({ error: "Unable to read webhook body." }, { status: 400 });
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { error: "Razorpay webhook secret is not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("X-Razorpay-Signature");
  if (!signature || !isValidSignature(rawBody, signature, secret)) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  if (!isRecord(payload) || typeof payload.event !== "string") {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  if (payload.event !== "payment.captured" && payload.event !== "order.paid") {
    return Response.json({ received: true });
  }

  const payment = nestedEntity(payload.payload, "payment");
  const order = nestedEntity(payload.payload, "order");
  const paymentId =
    (typeof payment?.id === "string" && payment.id) ||
    (typeof order?.payment_id === "string" && order.payment_id);
  const orderId =
    (typeof payment?.order_id === "string" && payment.order_id) ||
    (typeof order?.id === "string" && order.id);
  const amount = payment?.amount ?? order?.amount;
  const currency = payment?.currency ?? order?.currency;

  if (
    !paymentId ||
    !orderId ||
    typeof amount !== "number" ||
    typeof currency !== "string"
  ) {
    return Response.json({ error: "Payment details are missing from the event." }, {
      status: 400,
    });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { razorpayOrderId: orderId },
      select: {
        id: true,
        driverId: true,
        totalAmount: true,
        status: true,
        paymentId: true,
      },
    });
    if (!booking) return Response.json({ received: true });
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.paymentId === paymentId
    ) {
      return Response.json({ received: true });
    }

    if (
      amount !== Math.round(booking.totalAmount * 100) ||
      currency !== "INR"
    ) {
      return Response.json({ error: "Payment amount or currency does not match." }, {
        status: 400,
      });
    }
    if (booking.status !== BookingStatus.PENDING) {
      return Response.json({ received: true });
    }

    await confirmBookingAfterPayment({
      bookingId: booking.id,
      driverId: booking.driverId,
      razorpayOrderId: orderId,
      paymentId,
    });

    return Response.json({ received: true });
  } catch (error) {
    console.error("POST /api/payments/webhook failed:", error);
    return Response.json({ error: "Unable to process payment webhook." }, {
      status: 500,
    });
  }
}
