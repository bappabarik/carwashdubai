import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { categoryIdParamsSchema } from "./services.schema";
import { listTopLevelCategories, listSubCategories, getCategoryPricing } from "./services.service";

const carTypeQuerySchema = z.object({
  carType: z.enum(["sedan", "suv", "hatchback", "luxury"]).optional(),
});

export default async function servicesRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/services - top-level categories, e.g. "Car Washing"
  app.get("/services", async (_request, reply) => {
    const categories = await listTopLevelCategories(fastify.prisma);
    return reply.send({ success: true, data: categories });
  });

  // GET /api/services/:id/subcategories - e.g. Pressure Wash, Deep Clean
  app.get(
    "/services/:id/subcategories",
    { schema: { params: categoryIdParamsSchema } },
    async (request, reply) => {
      const subCategories = await listSubCategories(fastify.prisma, request.params.id);
      return reply.send({ success: true, data: subCategories });
    }
  );

  // GET /api/services/:id/pricing?carType=suv
  app.get(
    "/services/:id/pricing",
    { schema: { params: categoryIdParamsSchema, querystring: carTypeQuerySchema } },
    async (request, reply) => {
      const pricing = await getCategoryPricing(
        fastify.prisma,
        request.params.id,
        request.query.carType
      );
      return reply.send({ success: true, data: pricing });
    }
  );
}