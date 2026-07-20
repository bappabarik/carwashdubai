import { z } from "zod";

// A GeoJSON Polygon - what Leaflet.draw (or any standard map drawing tool)
// outputs natively, so the admin map UI can save this with no conversion.
const geoJsonPolygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z
    .array(
      z
        .array(z.tuple([z.number(), z.number()]))
        .min(4, "A polygon ring needs at least 4 points (including the closing point)")
    )
    .min(1, "At least one ring (the outer boundary) is required"),
});

export const createZoneBodySchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(40),
  boundary: geoJsonPolygonSchema,
});
export type CreateZoneBody = z.infer<typeof createZoneBodySchema>;

export const updateZoneBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  boundary: geoJsonPolygonSchema.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateZoneBody = z.infer<typeof updateZoneBodySchema>;

export const zoneIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const resolveZoneQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});
export type ResolveZoneQuery = z.infer<typeof resolveZoneQuerySchema>;

export const genericSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});