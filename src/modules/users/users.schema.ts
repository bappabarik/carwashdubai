import { z } from "zod";

export const updateProfileBodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

export const userProfileResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    phoneNumber: z.string(),
  }),
});