import { z } from "zod";

const paymentMethodEnum = z.enum(["cash", "card", "wallet"]);

const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "staff_assigned",
  "arriving",
  "in_progress",
  "completed",
  "cancelled",
] as const;

// One car within a booking: which car, and which services for it.
const carGroupSchema = z.object({
  carId: z.string().uuid(),
  serviceIds: z.array(z.string().uuid()).min(1, "Select at least one service for this car"),
});

function assertUniqueCarIds(cars: { carId: string }[]) {
  const ids = cars.map((c) => c.carId);
  return new Set(ids).size === ids.length;
}

export const validateBookingBodySchema = z.object({
  addressId: z.string().uuid().nullable().optional(),
  cars: z.array(carGroupSchema).min(1, "Add at least one car").refine(assertUniqueCarIds, {
    message: "Each car can only appear once per booking",
  }),
  scheduledDate: z.string().datetime().nullable().optional(),
  timeSlotTemplateId: z.string().uuid().nullable().optional(),
});
export type ValidateBookingBody = z.infer<typeof validateBookingBodySchema>;

export const createBookingBodySchema = z.object({
  addressId: z.string().uuid(),
  cars: z.array(carGroupSchema).min(1, "Add at least one car").refine(assertUniqueCarIds, {
    message: "Each car can only appear once per booking",
  }),
  scheduledDate: z.string().datetime(),
  timeSlotTemplateId: z.string().uuid(),
  paymentMethod: paymentMethodEnum,
  notes: z.string().max(500).nullable().optional(),
});
export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;

export const bookingIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listBookingsQuerySchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;

// Preset reasons shown to the customer as quick-select options; "other"
// requires a free-text explanation. Keep this list in sync with the
// mobile app's cancellation reason picker.
export const CANCELLATION_REASONS = [
  "change_of_plans",
  "booked_by_mistake",
  "price_too_high",
  "found_another_service",
  "weather_conditions",
  "other",
] as const;

export const requestCancellationBodySchema = z
  .object({
    reason: z.enum(CANCELLATION_REASONS),
    customReason: z.string().max(500).nullable().optional(),
  })
  .refine((data) => data.reason !== "other" || !!data.customReason?.trim(), {
    message: "Please describe the reason when selecting \"Other\"",
    path: ["customReason"],
  });
export type RequestCancellationBody = z.infer<typeof requestCancellationBodySchema>;

export const genericSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});