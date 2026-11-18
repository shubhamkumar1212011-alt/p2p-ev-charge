import { ConnectorType, StationType } from "@prisma/client";
import { z } from "zod";
import {
  createSessionToken,
  getAuthenticatedUser,
  setSessionCookie,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  chargerLocationQuerySchema,
  createChargerSchema,
  publicChargerSchema,
  publicChargersSchema,
  type PublicCharger,
} from "@/lib/public-charger";

const defaultLocation = { lat: 12.9716, lng: 77.5946 };
const discoveryHostEmail = "osm-station-directory@chargeshare.local";

const overpassResponseSchema = z.object({
  elements: z.array(
    z.object({
      id: z.number().int().positive(),
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
      tags: z.record(z.string(), z.string()).default({}),
    }),
  ),
});

type DiscoveredStation = Omit<PublicCharger, "distanceKm" | "description"> & {
  description: string;
  exactAddress: string;
};

function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = radians(lat2 - lat1);
  const lngDelta = radians(lng2 - lng1);
  const arc =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function inferConnectorType(tags: Record<string, string>): ConnectorType {
  if (tags["socket:chademo"]) return "CHADEMO";
  if (tags["socket:type2_combo"] || tags["socket:ccs"]) return "CCS2";
  if (tags["socket:type1"]) return "TYPE_1";
  return "TYPE_2";
}

function inferPowerKw(tags: Record<string, string>, connectorType: ConnectorType): number {
  const rawOutput = tags["socket:type2_combo:output"] || tags["socket:type2:output"];
  if (rawOutput) {
    const match = rawOutput.match(/(\d+(\.\d+)?)/);
    if (match) {
      const val = parseFloat(match[1]);
      if (val >= 3 && val <= 350) return val;
    }
  }
  return connectorType === "CCS2" || connectorType === "CHADEMO" ? 50 : 7.4;
}

async function fetchRealOsmStations(lat: number, lng: number): Promise<DiscoveredStation[]> {
  const query = `
[out:json][timeout:10];
(
  node["amenity"="charging_station"](around:8000,${lat},${lng});
);
out body 12;
`.trim();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(timer);
    if (!res.ok) return [];

    const parsed = overpassResponseSchema.safeParse(await res.json());
    if (!parsed.success) return [];

    return parsed.data.elements.map((el) => {
      const connectorType = inferConnectorType(el.tags);
      const powerKw = inferPowerKw(el.tags, connectorType);
      const operator = el.tags.operator || el.tags.brand;
      const title =
        el.tags.name?.trim() ||
        (operator ? `${operator} EV Hub` : `Public ${connectorType === "CCS2" ? "DC Fast" : "AC"} Point`);

      const street = [el.tags["addr:street"], el.tags["addr:suburb"], el.tags["addr:city"]]
        .filter(Boolean)
        .join(", ");

      return {
        id: `osm-${el.id}`,
        title,
        description: operator ? `Operated by ${operator}` : "Public OpenStreetMap verified charging point",
        exactAddress: street || `Coordinates ${el.lat.toFixed(4)}, ${el.lon.toFixed(4)}`,
        approxLat: el.lat,
        approxLng: el.lon,
        connectorType,
        stationType: "CHARGING" as StationType,
        powerKw,
        pricePerHour: powerKw >= 30 ? 320 : 140,
        amenities: el.tags.covered === "yes" ? ["Covered Parking"] : [],
        rating: 0,
        reviewCount: 0,
        isCommunityHost: false,
        hostName: operator || "Public Grid",
        isAvailable: true,
      };
    });
  } catch {
    return [];
  }
}

async function upsertOsmStations(stations: DiscoveredStation[]) {
  if (stations.length === 0) return;

  const directoryHost = await prisma.user.upsert({
    where: { email: discoveryHostEmail },
    update: {},
    create: {
      name: "Public Charging Directory",
      email: discoveryHostEmail,
      role: "HOST",
    },
  });

  await Promise.all(
    stations.map((station) =>
      prisma.charger.upsert({
        where: { id: station.id },
        update: {
          title: station.title,
          approxLat: station.approxLat,
          approxLng: station.approxLng,
          connectorType: station.connectorType,
          powerKw: station.powerKw,
          pricePerHour: station.pricePerHour,
          rating: 0,
          reviewCount: 0,
        },
        create: {
          id: station.id,
          hostId: directoryHost.id,
          title: station.title,
          description: station.description,
          exactAddress: station.exactAddress,
          approxLat: station.approxLat,
          approxLng: station.approxLng,
          connectorType: station.connectorType,
          stationType: "CHARGING",
          powerKw: station.powerKw,
          pricePerHour: station.pricePerHour,
          amenities: station.amenities,
          rating: station.rating,
          reviewCount: station.reviewCount,
          isAvailable: true,
        },
      }),
    ),
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedLocation = chargerLocationQuerySchema.safeParse({
      lat: searchParams.get("lat") ?? undefined,
      lng: searchParams.get("lng") ?? undefined,
    });

    const lat = parsedLocation.success && parsedLocation.data.lat !== undefined
      ? parsedLocation.data.lat
      : defaultLocation.lat;
    const lng = parsedLocation.success && parsedLocation.data.lng !== undefined
      ? parsedLocation.data.lng
      : defaultLocation.lng;

    // 1. Fetch real community host-listed chargers from PostgreSQL
    const dbCommunityChargers = await prisma.charger.findMany({
      where: {
        isAvailable: true,
        host: {
          email: { not: discoveryHostEmail },
        },
      },
      include: {
        host: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const communityMapped: PublicCharger[] = dbCommunityChargers.map((c) => ({
      id: c.id,
      title: c.title,
      description: null,
      approxLat: c.approxLat,
      approxLng: c.approxLng,
      connectorType: c.connectorType,
      stationType: c.stationType,
      powerKw: c.powerKw,
      pricePerHour: c.pricePerHour,
      amenities: c.amenities,
      rating: c.rating,
      reviewCount: c.reviewCount,
      isCommunityHost: true,
      hostName: c.host.name,
      isAvailable: c.isAvailable,
      distanceKm: calculateDistanceKm(lat, lng, c.approxLat, c.approxLng),
    }));

    // 2. Fetch real public OpenStreetMap charging points near the searched coordinates
    const osmDiscovered = await fetchRealOsmStations(lat, lng);
    await upsertOsmStations(osmDiscovered);

    const osmMapped: PublicCharger[] = osmDiscovered.map((s) => ({
      id: s.id,
      title: s.title,
      description: null,
      approxLat: s.approxLat,
      approxLng: s.approxLng,
      connectorType: s.connectorType,
      stationType: s.stationType,
      powerKw: s.powerKw,
      pricePerHour: s.pricePerHour,
      amenities: s.amenities,
      rating: 0,
      reviewCount: 0,
      isCommunityHost: false,
      hostName: s.hostName,
      isAvailable: s.isAvailable,
      distanceKm: calculateDistanceKm(lat, lng, s.approxLat, s.approxLng),
    }));

    const combined = [...communityMapped, ...osmMapped]
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 18);

    return Response.json(publicChargersSchema.parse(combined));
  } catch (error) {
    console.error("GET /api/chargers failed:", error);
    return Response.json({ error: "Unable to load nearby chargers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Please sign in to list your charger." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createChargerSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || "Invalid charger details." },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Upgrade user to HOST if they are currently a DRIVER
    if (user.role !== "HOST") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "HOST" },
      });
      const token = await createSessionToken({ id: user.id, role: "HOST" });
      await setSessionCookie(token);
    }

    const created = await prisma.charger.create({
      data: {
        hostId: user.id,
        title: data.title,
        description: data.description || null,
        exactAddress: data.exactAddress,
        approxLat: Math.round(data.approxLat * 1000) / 1000,
        approxLng: Math.round(data.approxLng * 1000) / 1000,
        connectorType: data.connectorType,
        stationType: "CHARGING",
        powerKw: data.powerKw,
        pricePerHour: data.pricePerHour,
        amenities: data.amenities,
        rating: 0,
        reviewCount: 0,
        isAvailable: true,
      },
    });

    const responsePayload = publicChargerSchema.parse({
      id: created.id,
      title: created.title,
      description: null,
      approxLat: created.approxLat,
      approxLng: created.approxLng,
      connectorType: created.connectorType,
      stationType: created.stationType,
      powerKw: created.powerKw,
      pricePerHour: created.pricePerHour,
      amenities: created.amenities,
      rating: created.rating,
      reviewCount: created.reviewCount,
      isCommunityHost: true,
      hostName: user.name,
      isAvailable: created.isAvailable,
      distanceKm: 0,
    });

    return Response.json({ charger: responsePayload }, { status: 201 });
  } catch (error) {
    console.error("POST /api/chargers failed:", error);
    return Response.json({ error: "Failed to publish charger listing." }, { status: 500 });
  }
}
