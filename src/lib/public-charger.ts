import { z } from "zod";

export const connectorTypes = ["TYPE_2", "CCS2", "TYPE_1", "CHADEMO"] as const;

export const connectorLabels: Record<(typeof connectorTypes)[number], string> =
  {
    TYPE_2: "Type 2",
    CCS2: "CCS2",
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
  approxLat: z.number().min(-90).max(90),
  approxLng: z.number().min(-180).max(180),
  connectorType: z.enum(connectorTypes),
  powerKw: z.number().positive(),
  pricePerHour: z.number().nonnegative(),
  isAvailable: z.boolean(),
});

export const publicChargersSchema = z.array(publicChargerSchema);

export type ConnectorType = (typeof connectorTypes)[number];
export type ConnectorFilter = z.infer<typeof connectorFilterSchema>;
export type PublicCharger = z.infer<typeof publicChargerSchema>;
