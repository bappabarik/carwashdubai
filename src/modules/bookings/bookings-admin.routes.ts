import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  listAllBookingsQuerySchema,
  updateBookingStatusBodySchema,
  bookingIdParamsSchema,
} from "./bookings-admin.schema";
import { listAllBookings, getBookingByIdAdmin, updateBookingStatus } from "./bookings-admin.service";

export default async function bookingsAdminRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  const readGuard = {
    onRequest: [fastify.authenticateStaff, fastify.requireRole("admin", "manager", "staff", "calling_agent")],
  };
  const writeGuard = { onRequest: [fastify.authenticateStaff, fastify.requireRole("admin", "manager")] };

  app.get(
    "/bookings",
    { onRequest: readGuard.onRequest, schema: { querystring: listAllBookingsQuerySchema } },
    async (request, reply) => {
      const result = await listAllBookings(fastify.prisma, request.query);
      return reply.send({ success: true, ...result });
    }
  );

  app.get(
    "/bookings/:id",
    { onRequest: readGuard.onRequest, schema: { params: bookingIdParamsSchema } },
    async (request, reply) => {
      const booking = await getBookingByIdAdmin(fastify.prisma, request.params.id);
      return reply.send({ success: true, data: booking });
    }
  );

  app.put(
    "/bookings/:id/status",
    {
      onRequest: writeGuard.onRequest,
      schema: { params: bookingIdParamsSchema, body: updateBookingStatusBodySchema },
    },
    async (request, reply) => {
      const booking = await updateBookingStatus(fastify.prisma, request.params.id, request.body.status);
      return reply.send({ success: true, data: booking });
    }
  );
}