import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  sendOtpBodySchema,
  verifyOtpBodySchema,
  refreshTokenBodySchema,
  logoutBodySchema,
  authTokensResponseSchema,
  refreshTokenResponseSchema,
  genericSuccessResponseSchema,
} from "./auth.schema";
import { requestOtp, verifyOtp, refreshAccessToken, logout } from "./auth.service";
import { env } from "../../config/env";

export default async function authRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/auth/send-otp",
    {
      schema: { body: sendOtpBodySchema, response: { 200: genericSuccessResponseSchema } },
      // Extra-tight rate limit on top of the global one - OTP sending costs
      // real money per SMS and is the classic abuse target.
      config: {
        rateLimit: {
          max: 3,
          timeWindow: "10 minutes",
        },
      },
    },
    async (request, reply) => {
      const { phoneNumber } = request.body;
      await requestOtp(fastify.prisma, phoneNumber);

      return reply.send({
        success: true as const,
        message: `OTP sent. It expires in ${env.OTP_EXPIRY_MINUTES} minutes.`,
      });
    }
  );

  app.post(
    "/auth/verify-otp",
    {
      schema: { body: verifyOtpBodySchema, response: { 200: authTokensResponseSchema } },
      config: { rateLimit: { max: 10, timeWindow: "10 minutes" } },
    },
    async (request, reply) => {
      const { phoneNumber, otpCode, deviceId, deviceType } = request.body;
      const result = await verifyOtp(fastify.prisma, {
        phoneNumber,
        otpCode,
        deviceId,
        deviceType,
      });

      return reply.send({ success: true as const, data: result });
    }
  );

  app.post(
    "/auth/refresh-token",
    {
      schema: {
        body: refreshTokenBodySchema,
        response: { 200: refreshTokenResponseSchema },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;
      const tokens = await refreshAccessToken(fastify.prisma, refreshToken);

      return reply.send({ success: true as const, data: tokens });
    }
  );

  app.post(
    "/auth/logout",
    { schema: { body: logoutBodySchema, response: { 200: genericSuccessResponseSchema } } },
    async (request, reply) => {
      const { refreshToken } = request.body;
      await logout(fastify.prisma, refreshToken);

      return reply.send({ success: true as const, message: "Logged out successfully" });
    }
  );
}
