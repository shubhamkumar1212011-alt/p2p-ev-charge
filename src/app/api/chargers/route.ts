import { prisma } from "@/lib/prisma";
import { publicChargersSchema } from "@/lib/public-charger";

export async function GET() {
  try {
    const chargers = await prisma.charger.findMany({
      where: { isAvailable: true },
      select: {
        id: true,
        title: true,
        approxLat: true,
        approxLng: true,
        connectorType: true,
        powerKw: true,
        pricePerHour: true,
        isAvailable: true,
      },
    });

    return Response.json(publicChargersSchema.parse(chargers));
  } catch (error) {
    console.error("GET /api/chargers failed:", error);
    return Response.json(
      { error: "Unable to load chargers." },
      { status: 500 },
    );
  }
}
