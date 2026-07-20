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
import authRoutes from "./modules/auth/auth.routes";
import authenticatePlugin from "./plugins/authenticate";

import authenticateStaffPlugin from "./plugins/authenticate-staff";
import staffAuthRoutes from "./modules/staff-auth/staff-auth.routes";

import servicesRoutes from "./modules/services/services.routes";
import servicesAdminRoutes from "./modules/services/services-admin.routes";

import addressesRoutes from "./modules/addresses/addresses.routes";
import carsRoutes from "./modules/cars/cars.routes";
import bookingsRoutes from "./modules/bookings/bookings.routes";
import timeSlotsRoutes from "./modules/time-slots/time-slots.routes";
import timeSlotsAdminRoutes from "./modules/time-slots/time-slots-admin.routes";
import bookingsAdminRoutes from "./modules/bookings/bookings-admin.routes";
import usersRoutes from "./modules/users/users.routes";
import cancellationRequestsRoutes from "./modules/cancellation-requests/cancellation-requests.routes";
import zonesRoutes from "./modules/zones/zones.routes";
import zonesAdminRoutes from "./modules/zones/zones-admin.routes";

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

  // user plugins 
  await app.register(authenticatePlugin);

  // staff plugins 
  await app.register(authenticateStaffPlugin);



  // User Routes
  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(authRoutes, { prefix: "/api" });
  app.register(usersRoutes, { prefix: "/api" });
  await app.register(addressesRoutes, { prefix: "/api" });
  await app.register(carsRoutes, { prefix: "/api" });
  await app.register(bookingsRoutes, { prefix: "/api" });
  await app.register(timeSlotsRoutes, { prefix: "/api" });
  await app.register(zonesRoutes, { prefix: "/api" });

  // Staff Routes 
  await app.register(staffAuthRoutes, { prefix: "/api" });
  await app.register(servicesRoutes, { prefix: "/api" });
  await app.register(servicesAdminRoutes, { prefix: "/api/backoffice" });
  await app.register(timeSlotsAdminRoutes, { prefix: "/api/backoffice" });
  await app.register(bookingsAdminRoutes, { prefix: "/api/backoffice" });
  await app.register(cancellationRequestsRoutes, { prefix: "/api/backoffice" });
  await app.register(zonesAdminRoutes, { prefix: "/api/backoffice" });


  return app;
}
