import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  createZoneBodySchema,
  updateZoneBodySchema,
  zoneIdParamsSchema,
  genericSuccessResponseSchema,
} from "./zones.schema";
import { listZones, getZoneById, createZone, updateZone, deleteZone } from "./zones.service";

export default async function zonesAdminRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  const readGuard = { onRequest: [fastify.authenticateStaff, fastify.requireRole("admin", "manager")] };
  const writeGuard = { onRequest: [fastify.authenticateStaff, fastify.requireRole("admin")] };

  app.get("/zones", { onRequest: readGuard.onRequest }, async (_request, reply) => {
    const zones = await listZones(fastify.prisma);
    return reply.send({ success: true, data: zones });
  });

  app.get(
    "/zones/:id",
    { onRequest: readGuard.onRequest, schema: { params: zoneIdParamsSchema } },
    async (request, reply) => {
      const zone = await getZoneById(fastify.prisma, request.params.id);
      return reply.send({ success: true, data: zone });
    }
  );

  app.post(
    "/zones",
    { onRequest: writeGuard.onRequest, schema: { body: createZoneBodySchema } },
    async (request, reply) => {
      const zone = await createZone(fastify.prisma, request.body);
      return reply.status(201).send({ success: true, data: zone });
    }
  );

  app.put(
    "/zones/:id",
    {
      onRequest: writeGuard.onRequest,
      schema: { params: zoneIdParamsSchema, body: updateZoneBodySchema },
    },
    async (request, reply) => {
      const zone = await updateZone(fastify.prisma, request.params.id, request.body);
      return reply.send({ success: true, data: zone });
    }
  );

  app.delete(
    "/zones/:id",
    {
      onRequest: writeGuard.onRequest,
      schema: { params: zoneIdParamsSchema, response: { 200: genericSuccessResponseSchema } },
    },
    async (request, reply) => {
      await deleteZone(fastify.prisma, request.params.id);
      return reply.send({ success: true as const, message: "Zone deleted" });
    }
  );
}