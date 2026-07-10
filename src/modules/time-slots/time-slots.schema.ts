import { z } from "zod";

const timeFormat = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:MM, 24-hour format");

export const createTimeSlotBodySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeFormat,
    endTime: timeFormat,
    capacity: z.number().int().positive().default(1),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });
export type CreateTimeSlotBody = z.infer<typeof createTimeSlotBodySchema>;

export const updateTimeSlotBodySchema = z.object({
  startTime: timeFormat.optional(),
  endTime: timeFormat.optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateTimeSlotBody = z.infer<typeof updateTimeSlotBodySchema>;

export const timeSlotIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const genericSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});