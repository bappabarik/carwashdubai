import { z } from "zod";

const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "staff_assigned",
  "arriving",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const listAllBookingsQuerySchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format").optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListAllBookingsQuery = z.infer<typeof listAllBookingsQuerySchema>;

export const updateBookingStatusBodySchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  note: z.string().max(500).optional(),
});
export type UpdateBookingStatusBody = z.infer<typeof updateBookingStatusBodySchema>;

export const bookingIdParamsSchema = z.object({
  id: z.string().uuid(),
});