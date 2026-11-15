import { randomInt } from "node:crypto";
import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { confirmedBookingResponseSchema, bookingRequestSchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bookingRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }
    if (user.role !== "DRIVER") {
      return Response.json(
        { error: "Only driver accounts can create bookings." },
        { status: 403 },
      );
    }

    const startTime = new Date(parsed.data.startTime);
    const endTime = new Date(parsed.data.endTime);
    if (
      startTime.getTime() < Date.now() - 60_000 ||
      endTime.getTime() <= Date.now()
    ) {
      return Response.json(
        { error: "Booking times must include the present or a future time." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(
      async (transaction) => {
        const charger = await transaction.charger.findUnique({
          where: { id: parsed.data.chargerId },
          select: { id: true, isAvailable: true, pricePerHour: true },
        });

        if (!charger?.isAvailable) {
          return { kind: "unavailable" as const };
        }

        const overlappingBooking = await transaction.booking.findFirst({
          where: {
            chargerId: charger.id,
            status: {
              in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE],
            },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
          select: { id: true },
        });

        if (overlappingBooking) {
          return { kind: "conflict" as const };
        }

        const durationHours =
          (endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000);
        const totalAmount =
          Math.round(charger.pricePerHour * durationHours * 100) / 100;
        if (!Number.isFinite(totalAmount) || totalAmount < 0) {
          throw new Error("Charger pricing produced an invalid booking total.");
        }

        const unlockPin = randomInt(0, 1_000_000).toString().padStart(6, "0");
        const booking = await transaction.booking.create({
          data: {
            driverId: user.id,
            chargerId: charger.id,
            startTime,
            endTime,
            totalAmount,
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
            charger: { select: { title: true } },
          },
        });

        const chargerAddress = await transaction.charger.findUniqueOrThrow({
          where: { id: charger.id },
          select: { exactAddress: true },
        });

        return {
          kind: "confirmed" as const,
          booking: {
            id: booking.id,
            startTime: booking.startTime.toISOString(),
            endTime: booking.endTime.toISOString(),
            totalAmount: booking.totalAmount,
            status: booking.status,
            unlockPin: booking.unlockPin,
            charger: {
              title: booking.charger.title,
              exactAddress: chargerAddress.exactAddress,
            },
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.kind === "unavailable") {
      return Response.json(
        { error: "This charger is not available." },
        { status: 404 },
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
      { status: 201 },
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

    console.error("POST /api/bookings failed:", error);
    return Response.json({ error: "Unable to create booking." }, { status: 500 });
  }
}
