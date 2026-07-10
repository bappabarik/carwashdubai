import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  createTimeSlotBodySchema,
  updateTimeSlotBodySchema,
  timeSlotIdParamsSchema,
  genericSuccessResponseSchema,
} from "./time-slots.schema";
import { listTemplates, createTemplate, updateTemplate, deleteTemplate } from "./time-slots.service";

export default async function timeSlotsAdminRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  const readGuard = { onRequest: [fastify.authenticateStaff, fastify.requireRole("admin", "manager")] };
  const writeGuard = { onRequest: [fastify.authenticateStaff, fastify.requireRole("admin")] };

  app.get("/time-slots", { onRequest: readGuard.onRequest }, async (_request, reply) => {
    const templates = await listTemplates(fastify.prisma);
    return reply.send({ success: true, data: templates });
  });

  app.post(
    "/time-slots",
    { onRequest: writeGuard.onRequest, schema: { body: createTimeSlotBodySchema } },
    async (request, reply) => {
      const template = await createTemplate(fastify.prisma, request.body);
      return reply.status(201).send({ success: true, data: template });
    }
  );

  app.put(
    "/time-slots/:id",
    {
      onRequest: writeGuard.onRequest,
      schema: { params: timeSlotIdParamsSchema, body: updateTimeSlotBodySchema },
    },
    async (request, reply) => {
      const template = await updateTemplate(fastify.prisma, request.params.id, request.body);
      return reply.send({ success: true, data: template });
    }
  );

  app.delete(
    "/time-slots/:id",
    {
      onRequest: writeGuard.onRequest,
      schema: { params: timeSlotIdParamsSchema, response: { 200: genericSuccessResponseSchema } },
    },
    async (request, reply) => {
      await deleteTemplate(fastify.prisma, request.params.id);
      return reply.send({ success: true as const, message: "Time slot deleted" });
    }
  );
}