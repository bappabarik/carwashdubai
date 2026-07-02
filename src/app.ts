import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";

import { env } from "./config/env";
import prismaPlugin from "./plugins/prisma";
import errorHandlerPlugin from "./plugins/error-handler";
import healthRoutes from "./modules/health/health.routes";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
          : undefined,
    },
    // Trust proxy headers when behind nginx / a load balancer in production
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  // Zod schema validation/serialization for all routes
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Security & core plugins
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
    credentials: true,
  });
  await app.register(sensible);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Infra plugins
  await app.register(prismaPlugin);
  await app.register(errorHandlerPlugin);

  // Routes
  await app.register(healthRoutes, { prefix: "/api" });

  return app;
}
