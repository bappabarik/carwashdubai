import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  staffLoginBodySchema,
  staffRefreshTokenBodySchema,
  staffLogoutBodySchema,
  staffAuthTokensResponseSchema,
  staffRefreshTokenResponseSchema,
  genericSuccessResponseSchema,
} from "./staff-auth.schema";
import { staffLogin, refreshStaffAccessToken, staffLogout } from "./staff-auth.service";

export default async function staffAuthRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/staff-auth/login",
    {
      schema: { body: staffLoginBodySchema, response: { 200: staffAuthTokensResponseSchema } },
      // Tight rate limit - this is the highest-value brute-force target in the API.
      config: { rateLimit: { max: 5, timeWindow: "10 minutes" } },
    },
    async (request, reply) => {
      const { email, password, deviceId } = request.body;
      const result = await staffLogin(fastify.prisma, { email, password, deviceId });

      return reply.send({ success: true as const, data: result });
    }
  );

  app.post(
    "/staff-auth/refresh-token",
    {
      schema: {
        body: staffRefreshTokenBodySchema,
        response: { 200: staffRefreshTokenResponseSchema },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;
      const tokens = await refreshStaffAccessToken(fastify.prisma, refreshToken);

      return reply.send({ success: true as const, data: tokens });
    }
  );

  app.post(
    "/staff-auth/logout",
    { schema: { body: staffLogoutBodySchema, response: { 200: genericSuccessResponseSchema } } },
    async (request, reply) => {
      const { refreshToken } = request.body;
      await staffLogout(fastify.prisma, refreshToken);

      return reply.send({ success: true as const, message: "Logged out successfully" });
    }
  );
}