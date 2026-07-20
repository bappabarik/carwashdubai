import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { resolveZoneQuerySchema } from "./zones.schema";
import { listZones, resolveZoneForPoint } from "./zones.service";

export default async function zonesRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Public - the mobile app uses this to draw zone outlines if needed, and
  // an admin map view can use it too without needing staff auth for just viewing.
  app.get("/zones", async (_request, reply) => {
    const zones = await listZones(fastify.prisma);
    return reply.send({ success: true, data: zones.filter((z) => z.isActive) });
  });

  // Public - the mobile app calls this whenever an address is selected
  // (including "My Location") to check if the service is offered there.
  app.get(
    "/zones/resolve",
    { schema: { querystring: resolveZoneQuerySchema } },
    async (request, reply) => {
      const result = await resolveZoneForPoint(fastify.prisma, request.query.lat, request.query.lng);
      return reply.send({ success: true, data: result });
    }
  );
}