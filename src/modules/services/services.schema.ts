import { z } from "zod";

const carTypeEnum = z.enum(["sedan", "suv", "hatchback", "luxury"]);

// ── Categories ──────────────────────────────

export const createCategoryBodySchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().default(0),
});
export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;

export const updateCategoryBodySchema = createCategoryBodySchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>;

export const categoryIdParamsSchema = z.object({
  id: z.string().uuid(),
});

// ── Pricing ──────────────────────────────

export const createPricingBodySchema = z.object({
  serviceCategoryId: z.string().uuid(),
  carType: carTypeEnum.nullable().optional(),
  price: z.number().positive(),
  weekendPrice: z.number().positive().nullable().optional(),
  durationMinutes: z.number().int().positive(),
});
export type CreatePricingBody = z.infer<typeof createPricingBodySchema>;

export const updatePricingBodySchema = createPricingBodySchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdatePricingBody = z.infer<typeof updatePricingBodySchema>;

export const pricingIdParamsSchema = z.object({
  id: z.string().uuid(),
});

// ── Shared response wrapper ──────────────────────────────

export const genericSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});