import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  createAddressBodySchema,
  updateAddressBodySchema,
  addressIdParamsSchema,
} from "./addresses.schema";
import {
  listAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
} from "./addresses.service";

export default async function addressesRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const guard = { onRequest: [fastify.authenticate] };

  app.get("/addresses", { onRequest: guard.onRequest }, async (request, reply) => {
    const addresses = await listAddresses(fastify.prisma, request.userId);
    return reply.send({ success: true, data: addresses });
  });

  app.get(
    "/addresses/:id",
    { onRequest: guard.onRequest, schema: { params: addressIdParamsSchema } },
    async (request, reply) => {
      const address = await getAddressById(fastify.prisma, request.userId, request.params.id);
      return reply.send({ success: true, data: address });
    }
  );

  app.post(
    "/addresses",
    { onRequest: guard.onRequest, schema: { body: createAddressBodySchema } },
    async (request, reply) => {
      const address = await createAddress(fastify.prisma, request.userId, request.body);
      return reply.status(201).send({ success: true, data: address });
    }
  );

  app.put(
    "/addresses/:id",
    {
      onRequest: guard.onRequest,
      schema: { params: addressIdParamsSchema, body: updateAddressBodySchema },
    },
    async (request, reply) => {
      const address = await updateAddress(
        fastify.prisma,
        request.userId,
        request.params.id,
        request.body
      );
      return reply.send({ success: true, data: address });
    }
  );

  app.delete(
    "/addresses/:id",
    { onRequest: guard.onRequest, schema: { params: addressIdParamsSchema } },
    async (request, reply) => {
      await deleteAddress(fastify.prisma, request.userId, request.params.id);
      return reply.send({ success: true, message: "Address deleted" });
    }
  );
}