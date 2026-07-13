import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  listCancellationRequestsQuerySchema,
  reviewCancellationRequestBodySchema,
  cancellationRequestIdParamsSchema,
} from "./cancellation-requests.schema";
import { listCancellationRequests, reviewCancellationRequest } from "./cancellation-requests.service";

export default async function cancellationRequestsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Reviewing (approving/rejecting) a cancellation is an ops decision -
  // admin/manager only, same as changing booking status.
  const guard = { onRequest: [fastify.authenticateStaff, fastify.requireRole("admin", "manager")] };

  app.get(
    "/cancellation-requests",
    { onRequest: guard.onRequest, schema: { querystring: listCancellationRequestsQuerySchema } },
    async (request, reply) => {
      const result = await listCancellationRequests(fastify.prisma, request.query);
      return reply.send({ success: true, ...result });
    }
  );

  app.put(
    "/cancellation-requests/:id",
    {
      onRequest: guard.onRequest,
      schema: { params: cancellationRequestIdParamsSchema, body: reviewCancellationRequestBodySchema },
    },
    async (request, reply) => {
      const result = await reviewCancellationRequest(
        fastify.prisma,
        request.params.id,
        request.staffId,
        request.body.action,
        request.body.reviewNote
      );
      return reply.send({ success: true, data: result });
    }
  );
}