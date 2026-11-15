import { z } from "zod";
import {
  geocodeQuerySchema,
  geocodeResultsSchema,
} from "@/lib/public-charger";

const nominatimResponseSchema = z.array(
  z.object({
    display_name: z.string().min(1),
    lat: z.coerce.number().finite().min(-90).max(90),
    lon: z.coerce.number().finite().min(-180).max(180),
  }),
);

const cache = new Map<
  string,
  { expiresAt: number; results: z.infer<typeof geocodeResultsSchema> }
>();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

async function acquireNominatimSlot() {
  let release = () => {};
  const slot = new Promise<void>((resolve) => {
    release = resolve;
  });
  const previous = requestQueue;
  requestQueue = previous.then(() => slot);
  await previous;

  const delay = Math.max(0, 1000 - (Date.now() - lastRequestAt));
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastRequestAt = Date.now();
  return release;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = geocodeQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
  });
  if (!parsed.success) {
    return Response.json(
      { error: "Search text must be between 2 and 120 characters." },
      { status: 400 },
    );
  }

  const query = parsed.data.q.toLowerCase();
  const cached = cache.get(query);
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json(cached.results);
  }

  const release = await acquireNominatimSlot();
  try {
    const nominatimUrl = new URL(
      "https://nominatim.openstreetmap.org/search",
    );
    nominatimUrl.searchParams.set("format", "json");
    nominatimUrl.searchParams.set("limit", "5");
    nominatimUrl.searchParams.set("q", parsed.data.q);

    const response = await fetch(nominatimUrl, {
      headers: {
        "user-agent":
          "ChargeShareEV/1.0 (global OpenStreetMap location search)",
        "accept-language": "en",
      },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Nominatim returned HTTP ${response.status}.`);
    }

    const upstream = nominatimResponseSchema.parse(await response.json());
    const results = geocodeResultsSchema.parse(
      upstream.map((result) => ({
        name: result.display_name,
        lat: result.lat,
        lng: result.lon,
      })),
    );
    cache.set(query, { expiresAt: Date.now() + 24 * 60 * 60 * 1000, results });
    if (cache.size > 100) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }

    return Response.json(results);
  } catch (error) {
    console.error("GET /api/geocode failed:", error);
    return Response.json(
      { error: "Unable to search for that location." },
      { status: 502 },
    );
  } finally {
    release();
  }
}
