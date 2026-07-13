import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  validateBookingBodySchema,
  createBookingBodySchema,
  bookingIdParamsSchema,
  listBookingsQuerySchema,
  requestCancellationBodySchema,
  genericSuccessResponseSchema,
} from "./bookings.schema";
import {
  validateBooking,
  createBooking,
  listBookings,
  getBookingById,
  requestCancellation,
} from "./bookings.service";

export default async function bookingsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const guard = { onRequest: [fastify.authenticate] };

  app.post(
    "/bookings/validate",
    { onRequest: guard.onRequest, schema: { body: validateBookingBodySchema } },
    async (request, reply) => {
      const result = await validateBooking(fastify.prisma, request.userId, request.body);
      return reply.send({ success: true, data: result });
    }
  );

  app.post(
    "/bookings",
    { onRequest: guard.onRequest, schema: { body: createBookingBodySchema } },
    async (request, reply) => {
      const booking = await createBooking(fastify.prisma, request.userId, request.body);
      return reply.status(201).send({ success: true, data: booking });
    }
  );

  app.get(
    "/bookings",
    { onRequest: guard.onRequest, schema: { querystring: listBookingsQuerySchema } },
    async (request, reply) => {
      const result = await listBookings(fastify.prisma, request.userId, request.query);
      return reply.send({ success: true, ...result });
    }
  );

  app.get(
    "/bookings/:id",
    { onRequest: guard.onRequest, schema: { params: bookingIdParamsSchema } },
    async (request, reply) => {
      const booking = await getBookingById(fastify.prisma, request.userId, request.params.id);
      return reply.send({ success: true, data: booking });
    }
  );

  // Note: this no longer cancels immediately - it creates a cancellation
  // request that admin/ops reviews and actions. See requestCancellation.
  app.post(
    "/bookings/:id/cancel",
    {
      onRequest: guard.onRequest,
      schema: {
        params: bookingIdParamsSchema,
        body: requestCancellationBodySchema,
        response: { 200: genericSuccessResponseSchema },
      },
    },
    async (request, reply) => {
      await requestCancellation(fastify.prisma, request.userId, request.params.id, request.body);
      return reply.send({
        success: true as const,
        message: "Cancellation request submitted for review",
      });
    }
  );
}