import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { updateProfileBodySchema, userProfileResponseSchema } from "./users.schema";
import { updateUserProfile } from "./users.service";

export default async function usersRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.patch(
    "/users/me",
    {
      // This ensures the request has a valid JWT and attaches request.user
      preValidation: [fastify.authenticate], 
      schema: { 
        body: updateProfileBodySchema, 
        response: { 200: userProfileResponseSchema } 
      },
    },
    async (request, reply) => {
      const { name, email } = request.body;
      const userId = request.userId; // Extracted safely from the JWT

      const updatedUser = await updateUserProfile(fastify.prisma, userId, {
        name,
        email,
      });

      return reply.send({ success: true as const, data: updatedUser });
    }
  );
}