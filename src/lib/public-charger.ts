import { z } from "zod";

export const connectorTypes = ["TYPE_2", "CCS2", "TYPE_1", "CHADEMO"] as const;
export const stationTypes = ["CHARGING", "FUEL"] as const;

export const hostAmenityOptions = [
  "Washroom",
  "Cafe / Snacks",
  "Covered Parking",
  "Wi-Fi",
  "Waiting Lounge",
  "24/7 CCTV Security",
] as const;

export const connectorLabels: Record<(typeof connectorTypes)[number], string> = {
  TYPE_2: "Type 2 AC",
  CCS2: "CCS2 DC Fast",
  TYPE_1: "Type 1",
  CHADEMO: "CHAdeMO",
};

export const connectorFilterSchema = z.union([
  z.literal("ALL"),
  z.enum(connectorTypes),
]);

export const publicChargerSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().default(null),
  approxLat: z.number().min(-90).max(90),
  approxLng: z.number().min(-180).max(180),
  connectorType: z.enum(connectorTypes),
  stationType: z.enum(stationTypes),
  powerKw: z.number().positive(),
  pricePerHour: z.number().nonnegative(),
  amenities: z.array(z.string()).default([]),
  rating: z.number().min(0).max(5).default(4.8),
  reviewCount: z.number().int().nonnegative().default(1),
  isCommunityHost: z.boolean().default(false),
  hostName: z.string().nullable().default(null),
  isAvailable: z.boolean(),
  distanceKm: z.number().nonnegative(),
});

export const publicChargersSchema = z.array(publicChargerSchema);

export const createChargerSchema = z.object({
  title: z.string().trim().min(3, "Station title must be at least 3 characters").max(100),
  description: z.string().trim().max(300).optional(),
  exactAddress: z.string().trim().min(5, "Please enter a complete street address").max(220),
  approxLat: z.number().min(-90).max(90),
  approxLng: z.number().min(-180).max(180),
  connectorType: z.enum(connectorTypes),
  powerKw: z.number().min(1).max(350),
  pricePerHour: z.number().min(10).max(5000),
  amenities: z.array(z.string()).max(10).default([]),
});

const coordinateQueryValue = (min: number, max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? NaN : value,
    z.coerce.number().finite().min(min).max(max),
  );

export const chargerLocationQuerySchema = z
  .object({
    lat: coordinateQueryValue(-90, 90).optional(),
    lng: coordinateQueryValue(-180, 180).optional(),
  })
  .refine(
    ({ lat, lng }) => (lat === undefined) === (lng === undefined),
    { message: "Latitude and longitude must be supplied together." },
  );

export const geocodeQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
});

export const geocodeResultsSchema = z.array(
  z.object({
    name: z.string().min(1),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
);

export type ConnectorType = (typeof connectorTypes)[number];
export type StationType = (typeof stationTypes)[number];
export type ConnectorFilter = z.infer<typeof connectorFilterSchema>;
export type PublicCharger = z.infer<typeof publicChargerSchema>;
export type CreateChargerInput = z.infer<typeof createChargerSchema>;
