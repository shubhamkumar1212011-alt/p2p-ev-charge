import { z } from "zod";
import { chargerLocationQuerySchema } from "@/lib/public-charger";

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const osmElementSchema = z.object({
  id: z.number(),
  type: z.enum(["node", "way", "relation"]),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: z
    .object({
      lat: z.number(),
      lon: z.number(),
    })
    .optional(),
  tags: z.record(z.string(), z.string()).default({}),
});

const overpassNearbySchema = z.object({
  elements: z.array(osmElementSchema).default([]),
});

export type NearbyPlace = {
  id: string;
  name: string;
  category: "CAFE" | "RESTAURANT" | "FAST_FOOD" | "RESTROOM";
  cuisine: string | null;
  lat: number;
  lng: number;
  distanceMeters: number;
  walkMinutes: number;
  mapsUrl: string;
};

function distanceMetersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = chargerLocationQuerySchema.safeParse({
    lat: searchParams.get("lat") ?? undefined,
    lng: searchParams.get("lng") ?? undefined,
  });

  if (!parsed.success || parsed.data.lat === undefined || parsed.data.lng === undefined) {
    return Response.json({ error: "Valid lat and lng query parameters are required." }, { status: 400 });
  }

  const { lat, lng } = parsed.data;
  const query = `
[out:json][timeout:12];
(
  node["amenity"~"^(cafe|restaurant|fast_food|toilets)$"](around:450,${lat},${lng});
  way["amenity"~"^(cafe|restaurant|fast_food|toilets)$"](around:450,${lat},${lng});
);
out center 25;
`.trim();

  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
        next: { revalidate: 300 },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const raw = await res.json();
      const validated = overpassNearbySchema.safeParse(raw);
      if (!validated.success) continue;

      const places: NearbyPlace[] = [];
      const seen = new Set<string>();

      for (const el of validated.data.elements) {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (elLat === undefined || elLng === undefined) continue;

        const amenity = el.tags.amenity;
        let category: NearbyPlace["category"] | null = null;
        if (amenity === "cafe") category = "CAFE";
        else if (amenity === "restaurant") category = "RESTAURANT";
        else if (amenity === "fast_food") category = "FAST_FOOD";
        else if (amenity === "toilets") category = "RESTROOM";
        if (!category) continue;

        const rawName = el.tags.name?.trim();
        if (!rawName && category !== "RESTROOM") continue;
        const name = rawName || "Public Restroom Facility";

        const dedupeKey = `${category}:${name.toLowerCase()}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const dist = distanceMetersBetween(lat, lng, elLat, elLng);
        places.push({
          id: `${el.type}-${el.id}`,
          name,
          category,
          cuisine: el.tags.cuisine ? el.tags.cuisine.replace(/_/g, " ") : null,
          lat: elLat,
          lng: elLng,
          distanceMeters: dist,
          walkMinutes: Math.max(1, Math.round(dist / 78)),
          mapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${elLat},${elLng}&travelmode=walking`,
        });
      }

      places.sort((a, b) => a.distanceMeters - b.distanceMeters);
      return Response.json({ places: places.slice(0, 12) });
    } catch {
      continue;
    }
  }

  return Response.json({ places: [] });
}
