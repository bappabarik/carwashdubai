import fastifyPlugin from "fastify-plugin";
import { FastifyInstance, FastifyError } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";

async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    // Zod validation errors (from route schema validation)
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.flatten(),
        },
      });
    }

    // Our own operational errors
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error({ err: error }, error.message);
      }
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    // Fastify's own validation (schema-based) errors
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
          details: error.validation,
        },
      });
    }

    // Unhandled — log full detail server-side, hide internals from client
    request.log.error({ err: error }, "Unhandled error");
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: statusCode === 500 ? "Something went wrong" : error.message,
      },
    });
  });

  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });
}

export default fastifyPlugin(errorHandlerPlugin, { name: "error-handler" });
