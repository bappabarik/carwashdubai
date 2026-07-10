import { z } from "zod";

export const listAllBookingsQuerySchema = z.object({
  status: z
    .enum(["pending", "confirmed", "staff_assigned", "in_progress", "completed", "cancelled"])
    .optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format").optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListAllBookingsQuery = z.infer<typeof listAllBookingsQuerySchema>;

export const updateBookingStatusBodySchema = z.object({
  status: z.enum(["pending", "confirmed", "staff_assigned", "in_progress", "completed", "cancelled"]),
});
export type UpdateBookingStatusBody = z.infer<typeof updateBookingStatusBodySchema>;

export const bookingIdParamsSchema = z.object({
  id: z.string().uuid(),
});