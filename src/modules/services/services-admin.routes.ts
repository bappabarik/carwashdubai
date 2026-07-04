import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  createCategoryBodySchema,
  updateCategoryBodySchema,
  categoryIdParamsSchema,
  createPricingBodySchema,
  updatePricingBodySchema,
  pricingIdParamsSchema,
} from "./services.schema";
import {
  listAllCategoriesAdmin,
  createCategory,
  updateCategory,
  createPricing,
  updatePricing,
  deletePricing,
} from "./services.service";

export default async function servicesAdminRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Every route below requires a staff/admin session. Writes are admin-only;
  // managers can view but not change pricing or categories.
  const readGuard = { onRequest: [fastify.authenticateStaff, fastify.requireRole("admin", "manager")] };
  const writeGuard = { onRequest: [fastify.authenticateStaff, fastify.requireRole("admin")] };

  // ── Categories ──────────────────────────────

  app.get("/service-categories", { onRequest: readGuard.onRequest }, async (_request, reply) => {
    const categories = await listAllCategoriesAdmin(fastify.prisma);
    return reply.send({ success: true, data: categories });
  });

  app.post(
    "/service-categories",
    { onRequest: writeGuard.onRequest, schema: { body: createCategoryBodySchema } },
    async (request, reply) => {
      const category = await createCategory(fastify.prisma, request.body);
      return reply.status(201).send({ success: true, data: category });
    }
  );

  app.put(
    "/service-categories/:id",
    {
      onRequest: writeGuard.onRequest,
      schema: { params: categoryIdParamsSchema, body: updateCategoryBodySchema },
    },
    async (request, reply) => {
      const category = await updateCategory(fastify.prisma, request.params.id, request.body);
      return reply.send({ success: true, data: category });
    }
  );

  // ── Pricing ──────────────────────────────

  app.post(
    "/service-pricing",
    { onRequest: writeGuard.onRequest, schema: { body: createPricingBodySchema } },
    async (request, reply) => {
      const pricing = await createPricing(fastify.prisma, request.body);
      return reply.status(201).send({ success: true, data: pricing });
    }
  );

  app.put(
    "/service-pricing/:id",
    {
      onRequest: writeGuard.onRequest,
      schema: { params: pricingIdParamsSchema, body: updatePricingBodySchema },
    },
    async (request, reply) => {
      const pricing = await updatePricing(fastify.prisma, request.params.id, request.body);
      return reply.send({ success: true, data: pricing });
    }
  );

  app.delete(
    "/service-pricing/:id",
    { onRequest: writeGuard.onRequest, schema: { params: pricingIdParamsSchema } },
    async (request, reply) => {
      await deletePricing(fastify.prisma, request.params.id);
      return reply.send({ success: true, message: "Pricing deleted" });
    }
  );
}