import { FastifyInstance } from "fastify";

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async (_request, reply) => {
    let dbStatus: "up" | "down" = "up";

    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "down";
    }

    const isHealthy = dbStatus === "up";

    return reply.status(isHealthy ? 200 : 503).send({
      success: isHealthy,
      status: isHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
      },
    });
  });
}
