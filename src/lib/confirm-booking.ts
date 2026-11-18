import { randomInt } from "node:crypto";
import { BookingStatus, Prisma } from "@prisma/client";
import {
  confirmedBookingResponseSchema,
  type ConfirmedBooking,
} from "@/lib/api-schemas";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient } from "@/lib/razorpay";

type ConfirmBookingResult =
  | { kind: "confirmed"; booking: ConfirmedBooking }
  | { kind: "unavailable" }
  | { kind: "conflict" };

type ConfirmBookingOptions = {
  bookingId: string;
  paymentId: string;
  driverId?: string;
  razorpayOrderId: string;
};

function confirmedBookingPayload(booking: {
  id: string;
  startTime: Date;
  endTime: Date;
  totalAmount: number;
  status: BookingStatus;
  unlockPin: string | null;
  charger: { title: string; exactAddress: string; description: string | null };
}) {
  return confirmedBookingResponseSchema.parse({
    id: booking.id,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    totalAmount: booking.totalAmount,
    status: "CONFIRMED",
    unlockPin: booking.unlockPin,
    charger: {
      title: booking.charger.title,
      exactAddress: booking.charger.exactAddress,
      accessInstructions: booking.charger.description,
    },
  });
}

async function findAlreadyConfirmed(options: ConfirmBookingOptions) {
  return prisma.booking.findFirst({
    where: {
      id: options.bookingId,
      ...(options.driverId ? { driverId: options.driverId } : {}),
      razorpayOrderId: options.razorpayOrderId,
      paymentId: options.paymentId,
      status: BookingStatus.CONFIRMED,
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
}

async function refundPayment(paymentId: string, amount: number, bookingId: string) {
  const razorpay = getRazorpayClient();
  if (!razorpay) {
    throw new Error("Razorpay credentials are not configured for conflict refunds.");
  }
  await razorpay.client.payments.refund(paymentId, {
    amount,
    notes: { booking_id: bookingId },
  });
}

export async function confirmBookingAfterPayment(
  options: ConfirmBookingOptions,
): Promise<ConfirmBookingResult> {
  const alreadyConfirmed = await findAlreadyConfirmed(options);
  if (alreadyConfirmed?.unlockPin) {
    return { kind: "confirmed", booking: confirmedBookingPayload(alreadyConfirmed) };
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id: options.bookingId,
      ...(options.driverId ? { driverId: options.driverId } : {}),
      status: BookingStatus.PENDING,
      razorpayOrderId: options.razorpayOrderId,
    },
    select: {
      id: true,
      chargerId: true,
      startTime: true,
      endTime: true,
      totalAmount: true,
    },
  });
  if (!booking) return { kind: "unavailable" };

  const expectedAmount = Math.round(booking.totalAmount * 100);

  try {
    const result = await prisma.$transaction(
      async (transaction) => {
        const currentBooking = await transaction.booking.findFirst({
          where: {
            id: booking.id,
            ...(options.driverId ? { driverId: options.driverId } : {}),
            status: BookingStatus.PENDING,
            razorpayOrderId: options.razorpayOrderId,
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

        if (overlappingBooking) {
          const cancelledBooking = await transaction.booking.updateMany({
            where: {
              id: booking.id,
              ...(options.driverId ? { driverId: options.driverId } : {}),
              status: BookingStatus.PENDING,
              razorpayOrderId: options.razorpayOrderId,
            },
            data: {
              status: BookingStatus.CANCELLED,
              paymentId: options.paymentId,
            },
          });
          return {
            kind: "conflict" as const,
            refund: cancelledBooking.count === 1,
          };
        }

        const unlockPin = randomInt(0, 1_000_000).toString().padStart(6, "0");
        const confirmedBooking = await transaction.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CONFIRMED,
            paymentId: options.paymentId,
            unlockPin,
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

        return {
          kind: "confirmed" as const,
          booking: confirmedBookingPayload(confirmedBooking),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.kind === "conflict") {
      if (result.refund) {
        await refundPayment(options.paymentId, expectedAmount, booking.id);
      }
      return { kind: "conflict" };
    }
    if (result.kind === "unavailable") {
      const concurrentConfirmation = await findAlreadyConfirmed(options);
      if (concurrentConfirmation?.unlockPin) {
        return {
          kind: "confirmed",
          booking: confirmedBookingPayload(concurrentConfirmation),
        };
      }
    }
    return result;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      const concurrentConfirmation = await findAlreadyConfirmed(options);
      if (concurrentConfirmation?.unlockPin) {
        return {
          kind: "confirmed",
          booking: confirmedBookingPayload(concurrentConfirmation),
        };
      }

      const cancelledBooking = await prisma.booking.updateMany({
        where: {
          id: booking.id,
          ...(options.driverId ? { driverId: options.driverId } : {}),
          status: BookingStatus.PENDING,
          razorpayOrderId: options.razorpayOrderId,
        },
        data: {
          status: BookingStatus.CANCELLED,
          paymentId: options.paymentId,
        },
      });
      if (cancelledBooking.count === 1) {
        await refundPayment(options.paymentId, expectedAmount, booking.id);
      }
      return { kind: "conflict" };
    }
    throw error;
  }
}
