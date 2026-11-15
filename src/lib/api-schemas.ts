import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .refine((password) => new TextEncoder().encode(password).length <= 72, {
    message: "Password must be no more than 72 bytes.",
  });

export const registerRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["DRIVER", "HOST"]).default("DRIVER"),
});

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const bookingRequestSchema = z
  .object({
    chargerId: z.string().trim().min(1).max(100),
    startTime: z.iso.datetime(),
    endTime: z.iso.datetime(),
  })
  .refine(
    ({ startTime, endTime }) =>
      new Date(endTime).getTime() > new Date(startTime).getTime(),
    { path: ["endTime"], message: "End time must be after start time." },
  );

export const chargerVerifyRequestSchema = z.object({
  chargerId: z.string().trim().min(1).max(100),
  unlockPin: z.string().regex(/^\d{6}$/, "PIN must contain six digits."),
});

export const bookingReservationResponseSchema = z.object({
  id: z.string(),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime(),
  totalAmount: z.number().nonnegative(),
  status: z.literal("PENDING"),
  charger: z.object({ title: z.string() }),
});

export const paymentOrderRequestSchema = z.object({
  bookingId: z.string().min(1).max(100),
});

export const paymentOrderResponseSchema = z.object({
  bookingId: z.string(),
  orderId: z.string(),
  keyId: z.string(),
  amount: z.number().int().positive(),
  currency: z.literal("INR"),
});

export const paymentVerificationRequestSchema = z.object({
  bookingId: z.string().min(1).max(100),
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().regex(/^[a-fA-F0-9]{64}$/),
});

export const sandboxConfirmationRequestSchema = z.object({
  bookingId: z.string().min(1).max(100),
});

export const sandboxAvailabilityResponseSchema = z.object({
  enabled: z.boolean(),
});

export const authUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: z.enum(["DRIVER", "HOST"]),
});

export const authResponseSchema = z.object({
  user: authUserSchema,
});

export const authSessionResponseSchema = z.object({
  user: authUserSchema.nullable(),
});

export const logoutResponseSchema = z.object({
  success: z.literal(true),
});

export const confirmedBookingResponseSchema = z.object({
  id: z.string(),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime(),
  totalAmount: z.number().nonnegative(),
  status: z.literal("CONFIRMED"),
  unlockPin: z.string().regex(/^\d{6}$/),
  charger: z.object({
    title: z.string(),
    exactAddress: z.string(),
  }),
});

export const chargerRelayResponseSchema = z.object({
  relayStatus: z.literal("POWER_ON"),
  bookingId: z.string(),
});

export const apiErrorSchema = z.object({
  error: z.string(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type ConfirmedBooking = z.infer<typeof confirmedBookingResponseSchema>;
