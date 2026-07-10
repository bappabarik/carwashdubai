import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { availabilityQuerySchema } from "./time-slots.schema";
import { getAvailabilityForDate } from "./time-slots.service";

export default async function availabilityRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/availability",
    { schema: { querystring: availabilityQuerySchema } },
    async (request, reply) => {
      const slots = await getAvailabilityForDate(fastify.prisma, request.query.date);
      return reply.send({ success: true, data: slots });
    }
  );
}