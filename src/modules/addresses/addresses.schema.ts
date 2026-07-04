import { z } from "zod";

const addressLabelEnum = z.enum(["home", "work", "other"]);

export const createAddressBodySchema = z.object({
  label: addressLabelEnum.default("home"),
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).nullable().optional(),
  city: z.string().min(1).max(120),
  area: z.string().max(120).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  isDefault: z.boolean().default(false),
});
export type CreateAddressBody = z.infer<typeof createAddressBodySchema>;

export const updateAddressBodySchema = createAddressBodySchema.partial();
export type UpdateAddressBody = z.infer<typeof updateAddressBodySchema>;

export const addressIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const genericSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});