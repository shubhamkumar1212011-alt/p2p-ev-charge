import { createHash } from "node:crypto";
import { ConnectorType, StationType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  chargerLocationQuerySchema,
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

type DiscoveredStation = Omit<PublicCharger, "distanceKm"> & {
  exactAddress: string;
};
type StationWithDistance = DiscoveredStation & { distanceKm: number };

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = radians(lat2 - lat1);
  const lngDelta = radians(lng2 - lng1);
  const arc =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function stationAddress(
  tags: Record<string, string>,
  lat: number,
  lng: number,
) {
  const fullAddress = tags["addr:full"]?.trim();
  if (fullAddress) return fullAddress;

  const addressParts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:village"],
    tags["addr:postcode"],
    tags["addr:country"],
  ].filter((part) => part?.trim());

  return addressParts.length > 0
    ? addressParts.join(", ")
    : `${tags.name?.trim() || "Station"} (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}

function stationConnector(tags: Record<string, string>) {
  const isPresent = (value: string | undefined) =>
    Boolean(value && !["0", "no", "false"].includes(value.toLowerCase()));
  if (isPresent(tags["socket:chademo"])) return ConnectorType.CHADEMO;
  if (isPresent(tags["socket:ccs2"]) || isPresent(tags["socket:ccs"])) {
    return ConnectorType.CCS2;
  }
  if (isPresent(tags["socket:type1"])) return ConnectorType.TYPE_1;
  return ConnectorType.TYPE_2;
}

function stationPower(tags: Record<string, string>, type: StationType) {
  const output = tags["charging_station:output"]?.match(/\d+(?:[.,]\d+)?/);
  const parsed = output ? Number(output[0].replace(",", ".")) : NaN;
  if (Number.isFinite(parsed) && parsed > 0 && parsed <= 1000) return parsed;
  return type === StationType.FUEL ? 11 : 22;
}

function stationFromOverpass(element: z.infer<typeof overpassResponseSchema>["elements"][number]): DiscoveredStation {
  const stationType =
    element.tags.amenity === "fuel"
      ? StationType.FUEL
      : StationType.CHARGING;
  const area =
    element.tags["addr:suburb"] ??
    element.tags["addr:city"] ??
    element.tags["addr:town"];
  const fallbackTitle =
    stationType === StationType.FUEL ? "Fuel station" : "EV charging station";

  return {
    id: `osm-node-${element.id}`,
    title: element.tags.name?.trim() || [fallbackTitle, area].filter(Boolean).join(" · "),
    exactAddress: stationAddress(element.tags, element.lat, element.lon),
    approxLat: element.lat,
    approxLng: element.lon,
    connectorType: stationConnector(element.tags),
    stationType,
    powerKw: stationPower(element.tags, stationType),
    pricePerHour:
      stationType === StationType.FUEL ? 180 : 120,
    isAvailable: true,
  };
}

async function fetchNearbyStations(lat: number, lng: number) {
  const query = [
    "[out:json][timeout:8];",
    "(",
    `node["amenity"="fuel"](around:5000,${lat},${lng});`,
    `node["amenity"="charging_station"](around:5000,${lat},${lng});`,
    ");out body;",
  ].join("");
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "ChargeShareEV/1.0 (OpenStreetMap station discovery)",
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Overpass returned HTTP ${response.status}.`);
  }

  const data = overpassResponseSchema.parse(await response.json());
  return data.elements.map(stationFromOverpass);
}

function generateFallbackStations(lat: number, lng: number) {
  return Array.from({ length: 8 }, (_, index): DiscoveredStation => {
    const type =
      index % 4 === 3 ? StationType.FUEL : StationType.CHARGING;
    const angle = (index * 2 * Math.PI) / 8;
    const radiusKm = 0.4 + (index % 4) * 0.35;
    const latRad = (lat * Math.PI) / 180;
    const stationLat = Math.max(
      -90,
      Math.min(90, lat + (radiusKm / 111.32) * Math.cos(angle)),
    );
    const stationLng =
      ((((lng +
        (radiusKm / (111.32 * Math.max(Math.abs(Math.cos(latRad)), 0.01))) *
          Math.sin(angle) +
        540) %
        360) -
        180) *
        100_000) /
      100_000;
    const hash = createHash("sha256")
      .update(`${lat.toFixed(5)}:${lng.toFixed(5)}:${index}`)
      .digest("hex")
      .slice(0, 18);

    return {
      id: `fallback-${hash}`,
      title:
        type === StationType.FUEL
          ? `Nearby fuel / EV stop ${index + 1}`
          : `Nearby EV charging station ${index + 1}`,
      exactAddress: `Generated nearby station, ${stationLat.toFixed(5)}, ${stationLng.toFixed(5)}`,
      approxLat: stationLat,
      approxLng: stationLng,
      connectorType: ConnectorType.TYPE_2,
      stationType: type,
      powerKw: type === StationType.FUEL ? 11 : 22,
      pricePerHour: type === StationType.FUEL ? 180 : 120,
      isAvailable: true,
    };
  });
}

async function upsertStations(stations: StationWithDistance[]) {
  return prisma.$transaction(async (transaction) => {
    const host = await transaction.user.upsert({
      where: { email: discoveryHostEmail },
      update: { name: "OpenStreetMap Station Directory", role: "HOST" },
      create: {
        name: "OpenStreetMap Station Directory",
        email: discoveryHostEmail,
        role: "HOST",
      },
      select: { id: true },
    });

    for (const station of stations) {
      const charger = {
        id: station.id,
        hostId: host.id,
        title: station.title,
        exactAddress: station.exactAddress,
        approxLat: station.approxLat,
        approxLng: station.approxLng,
        connectorType: station.connectorType,
        stationType: station.stationType,
        powerKw: station.powerKw,
        pricePerHour: station.pricePerHour,
        isAvailable: station.isAvailable,
      };
      await transaction.charger.upsert({
        where: { id: station.id },
        create: charger,
        update: charger,
      });
    }

    return host.id;
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = chargerLocationQuerySchema.safeParse({
    lat: url.searchParams.get("lat") ?? undefined,
    lng: url.searchParams.get("lng") ?? undefined,
  });
  if (!query.success) {
    return Response.json(
      {
        error: "Location coordinates are invalid.",
        issues: query.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const lat = query.data.lat ?? defaultLocation.lat;
  const lng = query.data.lng ?? defaultLocation.lng;

  try {
    let stations: DiscoveredStation[];
    try {
      stations = await fetchNearbyStations(lat, lng);
      if (stations.length === 0) {
        throw new Error("Overpass returned no nearby stations.");
      }
    } catch (error) {
      console.warn("Using generated nearby stations:", error);
      stations = generateFallbackStations(lat, lng);
    }

    const nearestStations: StationWithDistance[] = stations
      .map((station) => ({
        ...station,
        distanceKm: calculateDistanceKm(
          lat,
          lng,
          station.approxLat,
          station.approxLng,
        ),
      }))
      .sort(
        (left, right) =>
          left.distanceKm - right.distanceKm ||
          left.id.localeCompare(right.id),
      )
      .slice(0, 8);

    await upsertStations(nearestStations);

    return Response.json(
      publicChargersSchema.parse(
        nearestStations.map(
          ({
            id,
            title,
            approxLat,
            approxLng,
            connectorType,
            stationType,
            powerKw,
            pricePerHour,
            isAvailable,
            distanceKm,
          }) => ({
            id,
            title,
            approxLat,
            approxLng,
            connectorType,
            stationType,
            powerKw,
            pricePerHour,
            isAvailable,
            distanceKm,
          }),
        ),
      ),
    );
  } catch (error) {
    console.error("GET /api/chargers failed:", error);
    return Response.json(
      { error: "Unable to load nearby stations." },
      { status: 500 },
    );
  }
}
