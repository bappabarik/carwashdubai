import { z } from "zod";

// E.164 format: + followed by 8-15 digits, e.g. +971501234567
const phoneNumberSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Phone number must be in E.164 format, e.g. +971501234567");

export const sendOtpBodySchema = z.object({
  phoneNumber: phoneNumberSchema,
});
export type SendOtpBody = z.infer<typeof sendOtpBodySchema>;

export const verifyOtpBodySchema = z.object({
  phoneNumber: phoneNumberSchema,
  otpCode: z.string().length(6, "OTP must be 6 digits").regex(/^\d+$/, "OTP must be numeric"),
  deviceId: z.string().min(1, "deviceId is required"),
  deviceType: z.enum(["ios", "android"]),
});
export type VerifyOtpBody = z.infer<typeof verifyOtpBodySchema>;

export const refreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});
export type RefreshTokenBody = z.infer<typeof refreshTokenBodySchema>;

export const logoutBodySchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});
export type LogoutBody = z.infer<typeof logoutBodySchema>;

// Response shapes (used with fastify-type-provider-zod for response serialization)
export const authTokensResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    isNewUser: z.boolean(),
    user: z.object({
      id: z.string(),
      phoneNumber: z.string(),
      name: z.string().nullable(),
    }),
  }),
});

export const genericSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export const refreshTokenResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});
