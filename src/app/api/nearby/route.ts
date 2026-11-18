import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export type NearbyPlace = {
  id: string;
  name: string;
  category: "CAFE" | "RESTAURANT" | "RESTROOM";
  distanceMeters: number;
  walkMinutes: number;
  lat: number;
  lng: number;
  perkTitle?: string;
};

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    lat: searchParams.get("lat"),
    lng: searchParams.get("lng"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const { lat, lng } = parsed.data;
  const radius = 300; // Strict 300-meter walking radius

  const overpassQuery = `
    [out:json][timeout:7];
    (
      node["amenity"~"cafe|fast_food"](around:${radius},${lat},${lng});
      way["amenity"~"cafe|fast_food"](around:${radius},${lat},${lng});
      node["amenity"="restaurant"](around:${radius},${lat},${lng});
      way["amenity"="restaurant"](around:${radius},${lat},${lng});
      node["amenity"="toilets"](around:${radius},${lat},${lng});
      way["amenity"="toilets"](around:${radius},${lat},${lng});
    );
    out center 25;
  `;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7500);

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: controller.signal,
      next: { revalidate: 300 },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ places: [] }, { status: 200 });
    }

    const data = await res.json();
    const elements = Array.isArray(data?.elements) ? data.elements : [];

    const seen = new Set<string>();
    const places: NearbyPlace[] = [];

    for (const el of elements) {
      const pLat = el.lat ?? el.center?.lat;
      const pLng = el.lon ?? el.center?.lon;
      if (typeof pLat !== "number" || typeof pLng !== "number") continue;

      const amenity = el.tags?.amenity ?? "";
      const category: NearbyPlace["category"] =
        amenity === "toilets"
          ? "RESTROOM"
          : amenity === "restaurant"
          ? "RESTAURANT"
          : "CAFE";

      const rawName = el.tags?.name?.trim();
      const name =
        rawName ||
        (category === "RESTROOM"
          ? "Public Restroom Facility"
          : category === "RESTAURANT"
          ? "Local Eatery"
          : "Neighborhood Cafe");

      const dedupeKey = `${category}-${name.toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const distanceMeters = haversineMeters(lat, lng, pLat, pLng);
      if (distanceMeters > 300) continue;

      const walkMinutes = Math.max(1, Math.round(distanceMeters / 75));

      places.push({
        id: `${el.type}-${el.id}`,
        name,
        category,
        distanceMeters,
        walkMinutes,
        lat: pLat,
        lng: pLng,
        ...(category === "RESTROOM"
          ? { perkTitle: "Washroom listed on OpenStreetMap" }
          : {}),
      });
    }

    places.sort((a, b) => a.distanceMeters - b.distanceMeters);

    return NextResponse.json({ places: places.slice(0, 8) });
  } catch {
    return NextResponse.json({ places: [] }, { status: 200 });
  }
}
