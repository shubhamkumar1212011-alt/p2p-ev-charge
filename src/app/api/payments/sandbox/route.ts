import { randomInt } from "node:crypto";
import { BookingStatus, Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  confirmedBookingResponseSchema,
  sandboxAvailabilityResponseSchema,
  sandboxConfirmationRequestSchema,
} from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";
import { prisma } from "@/lib/prisma";
import { isSandboxPaymentsEnabled } from "@/lib/razorpay";

const pendingReservationLifetimeMs = 15 * 60 * 1000;

export async function GET() {
  return Response.json(
    sandboxAvailabilityResponseSchema.parse({
      enabled: isSandboxPaymentsEnabled(),
    }),
  );
}

export async function POST(request: Request) {
  if (!isSandboxPaymentsEnabled()) {
    return Response.json(
      { error: "Sandbox payment confirmation is disabled." },
      { status: 403 },
    );
  }

  const parsed = await parseJsonBody(request, sandboxConfirmationRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }
    if (user.role !== "DRIVER") {
      return Response.json(
        { error: "Only the booking driver can confirm a sandbox payment." },
        { status: 403 },
      );
    }

    const pendingCreatedAfter = new Date(Date.now() - pendingReservationLifetimeMs);
    const result = await prisma.$transaction(
      async (transaction) => {
        const booking = await transaction.booking.findFirst({
          where: {
            id: parsed.data.bookingId,
            driverId: user.id,
            status: BookingStatus.PENDING,
            razorpayOrderId: null,
          },
          select: {
            id: true,
            chargerId: true,
            startTime: true,
            endTime: true,
          },
        });

        if (!booking) return { kind: "unavailable" as const };

        const overlappingBooking = await transaction.booking.findFirst({
          where: {
            chargerId: booking.chargerId,
            id: { not: booking.id },
            OR: [
              {
                status: {
                  in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE],
                },
              },
              {
                status: BookingStatus.PENDING,
                createdAt: { gte: pendingCreatedAfter },
              },
            ],
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
          booking: {
            id: confirmedBooking.id,
            startTime: confirmedBooking.startTime.toISOString(),
            endTime: confirmedBooking.endTime.toISOString(),
            totalAmount: confirmedBooking.totalAmount,
            status: confirmedBooking.status,
            unlockPin: confirmedBooking.unlockPin,
            charger: {
              title: confirmedBooking.charger.title,
              exactAddress: confirmedBooking.charger.exactAddress,
              accessInstructions: confirmedBooking.charger.description,
            },
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.kind === "unavailable") {
      return Response.json(
        { error: "This pending booking is not owned by you or cannot be confirmed." },
        { status: 403 },
      );
    }
    if (result.kind === "conflict") {
      return Response.json(
        { error: "This charger already has a booking for that time." },
        { status: 409 },
      );
    }

    return Response.json(
      confirmedBookingResponseSchema.parse(result.booking),
    );
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

    console.error("POST /api/payments/sandbox failed:", error);
    return Response.json(
      { error: "Unable to confirm the sandbox booking." },
      { status: 500 },
    );
  }
}
