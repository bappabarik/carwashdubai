import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { createCarBodySchema, updateCarBodySchema, carIdParamsSchema } from "./cars.schema";
import { listCars, getCarById, createCar, updateCar, deleteCar } from "./cars.service";

export default async function carsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const guard = { onRequest: [fastify.authenticate] };

  app.get("/cars", { onRequest: guard.onRequest }, async (request, reply) => {
    const cars = await listCars(fastify.prisma, request.userId);
    return reply.send({ success: true, data: cars });
  });

  app.get(
    "/cars/:id",
    { onRequest: guard.onRequest, schema: { params: carIdParamsSchema } },
    async (request, reply) => {
      const car = await getCarById(fastify.prisma, request.userId, request.params.id);
      return reply.send({ success: true, data: car });
    }
  );

  app.post(
    "/cars",
    { onRequest: guard.onRequest, schema: { body: createCarBodySchema } },
    async (request, reply) => {
      const car = await createCar(fastify.prisma, request.userId, request.body);
      return reply.status(201).send({ success: true, data: car });
    }
  );

  app.put(
    "/cars/:id",
    { onRequest: guard.onRequest, schema: { params: carIdParamsSchema, body: updateCarBodySchema } },
    async (request, reply) => {
      const car = await updateCar(fastify.prisma, request.userId, request.params.id, request.body);
      return reply.send({ success: true, data: car });
    }
  );

  app.delete(
    "/cars/:id",
    { onRequest: guard.onRequest, schema: { params: carIdParamsSchema } },
    async (request, reply) => {
      await deleteCar(fastify.prisma, request.userId, request.params.id);
      return reply.send({ success: true, message: "Car deleted" });
    }
  );
}