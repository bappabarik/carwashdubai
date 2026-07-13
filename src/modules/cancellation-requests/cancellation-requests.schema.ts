import { z } from "zod";

export const listCancellationRequestsQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListCancellationRequestsQuery = z.infer<typeof listCancellationRequestsQuerySchema>;

export const reviewCancellationRequestBodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNote: z.string().max(500).nullable().optional(),
});
export type ReviewCancellationRequestBody = z.infer<typeof reviewCancellationRequestBodySchema>;

export const cancellationRequestIdParamsSchema = z.object({
  id: z.string().uuid(),
});