import { BookingStatus } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chargerRelayResponseSchema, chargerVerifyRequestSchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/parse-json-body";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, chargerVerifyRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "DRIVER") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const now = new Date();
    const booking = await prisma.$transaction(async (transaction) => {
      const activeBooking = await transaction.booking.findFirst({
        where: {
          driverId: user.id,
          chargerId: parsed.data.chargerId,
          unlockPin: parsed.data.unlockPin,
          status: {
            in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE],
          },
          startTime: { lte: now },
          endTime: { gt: now },
        },
        select: { id: true },
      });

      if (!activeBooking) return null;

      await transaction.booking.update({
        where: { id: activeBooking.id },
        data: { status: BookingStatus.ACTIVE },
        select: { id: true },
      });

      return activeBooking;
    });

    if (!booking) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    return Response.json(
      chargerRelayResponseSchema.parse({
        relayStatus: "POWER_ON",
        bookingId: booking.id,
      }),
    );
  } catch (error) {
    console.error("POST /api/charger/verify failed:", error);
    return Response.json(
      { error: "Unable to verify charger access." },
      { status: 500 },
    );
  }
}
