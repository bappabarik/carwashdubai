import fastifyPlugin from "fastify-plugin";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../utils/jwt";
import { UnauthorizedError } from "../utils/errors";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    userPhoneNumber: string;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function authenticatePlugin(fastify: FastifyInstance) {
  fastify.decorate(
    "authenticate",
    async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError("Missing or malformed Authorization header");
      }

      const token = authHeader.slice("Bearer ".length);

      try {
        const payload = verifyAccessToken(token);
        request.userId = payload.userId;
        request.userPhoneNumber = payload.phoneNumber;
      } catch {
        throw new UnauthorizedError("Invalid or expired access token");
      }

      // Defense in depth: make sure the user hasn't been blocked since the
      // token was issued. Access tokens are short-lived (15m default) so
      // this check matters less than for long-lived sessions, but it's cheap.
      const user = await fastify.prisma.user.findUnique({ where: { id: request.userId } });
      if (!user || user.status === "blocked") {
        throw new UnauthorizedError("Account is not active");
      }
    }
  );
}

export default fastifyPlugin(authenticatePlugin, { name: "authenticate", dependencies: ["prisma"] });