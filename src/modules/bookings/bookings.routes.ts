import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  validateBookingBodySchema,
  createBookingBodySchema,
  bookingIdParamsSchema,
  listBookingsQuerySchema,
  genericSuccessResponseSchema,
} from "./bookings.schema";
import {
  validateBooking,
  createBooking,
  listBookings,
  getBookingById,
  cancelBooking,
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

  app.post(
    "/bookings/:id/cancel",
    {
      onRequest: guard.onRequest,
      schema: { params: bookingIdParamsSchema, response: { 200: genericSuccessResponseSchema } },
    },
    async (request, reply) => {
      await cancelBooking(fastify.prisma, request.userId, request.params.id);
      return reply.send({ success: true as const, message: "Booking cancelled" });
    }
  );
}