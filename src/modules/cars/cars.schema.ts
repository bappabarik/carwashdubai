import { z } from "zod";

const carTypeEnum = z.enum(["sedan", "suv", "hatchback", "luxury"]);
const currentYear = new Date().getFullYear();

export const createCarBodySchema = z.object({
  brand: z.string().min(1).max(80),
  model: z.string().min(1).max(80),
  year: z.number().int().min(1980).max(currentYear + 1).nullable().optional(),
  color: z.string().max(40).nullable().optional(),
  plateNumber: z.string().min(1).max(20),
  carType: carTypeEnum,
  isDefault: z.boolean().default(false),
});
export type CreateCarBody = z.infer<typeof createCarBodySchema>;

export const updateCarBodySchema = createCarBodySchema.partial();
export type UpdateCarBody = z.infer<typeof updateCarBodySchema>;

export const carIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const genericSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});