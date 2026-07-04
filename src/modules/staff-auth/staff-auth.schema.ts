import { z } from "zod";

export const staffLoginBodySchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(1, "Password is required"),
  deviceId: z.string().min(1, "deviceId is required"),
});
export type StaffLoginBody = z.infer<typeof staffLoginBodySchema>;

export const staffRefreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});
export type StaffRefreshTokenBody = z.infer<typeof staffRefreshTokenBodySchema>;

export const staffLogoutBodySchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});
export type StaffLogoutBody = z.infer<typeof staffLogoutBodySchema>;

export const staffAuthTokensResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    staff: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      role: z.string(),
    }),
  }),
});

export const staffRefreshTokenResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

export const genericSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});