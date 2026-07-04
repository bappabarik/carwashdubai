import fastifyPlugin from "fastify-plugin";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyStaffAccessToken, StaffAccessTokenPayload } from "../utils/staffJwt";
import { UnauthorizedError, ForbiddenError } from "../utils/errors";

declare module "fastify" {
  interface FastifyRequest {
    staffId: string;
    staffRole: string;
  }
  interface FastifyInstance {
    authenticateStaff: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      ...roles: string[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function authenticateStaffPlugin(fastify: FastifyInstance) {
  fastify.decorate(
    "authenticateStaff",
    async function authenticateStaff(request: FastifyRequest, _reply: FastifyReply) {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError("Missing or malformed Authorization header");
      }

      const token = authHeader.slice("Bearer ".length);

      let payload: StaffAccessTokenPayload;
      try {
        payload = verifyStaffAccessToken(token);
      } catch {
        throw new UnauthorizedError("Invalid or expired access token");
      }

      const staff = await fastify.prisma.staffMember.findUnique({
        where: { id: payload.staffId },
      });
      if (!staff || staff.status === "blocked") {
        throw new UnauthorizedError("Account is not active");
      }

      request.staffId = staff.id;
      request.staffRole = staff.role;
    }
  );

  // Usage: { onRequest: [fastify.authenticateStaff, fastify.requireRole("admin")] }
  // Must run AFTER authenticateStaff, since it reads request.staffRole.
  fastify.decorate("requireRole", (...roles: string[]) => {
    return async function requireRole(request: FastifyRequest, _reply: FastifyReply) {
      if (!roles.includes(request.staffRole)) {
        throw new ForbiddenError("You don't have permission to perform this action");
      }
    };
  });
}

export default fastifyPlugin(authenticateStaffPlugin, {
  name: "authenticate-staff",
  dependencies: ["prisma"],
});