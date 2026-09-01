import fastifyCookies from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import { fastifyPostgres } from "@fastify/postgres";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { fastify } from "fastify";
import { dbConfig } from "./configs/db.config";
import { apiErrorHandler } from "./errors/api-error";
import { assessmentRoutes } from "./routes/assessment/assessment.route";
import { dashboardRoutes } from "./routes/dashboard/dashboard.route";
import { clinicianRoutes } from "./routes/clinician/clinician.route";
import { patientRoutes } from "./routes/patient/patient.route";
import { predictionRoutes } from "./routes/prediction/prediction.route";
import { userRoutes } from "./routes/user/user.route";

type BuildServerOptions = {
     logger?: boolean;
};

const buildServer = (options: BuildServerOptions = {}) => {
     const server = fastify({
          logger: options.logger ?? true,
          ajv: {
               customOptions: {
                    removeAdditional: false
               }
          }
     }).withTypeProvider<TypeBoxTypeProvider>();

     server.setErrorHandler(apiErrorHandler);
     server.setNotFoundHandler((request, reply) => reply.code(404).send({
          statusCode: 404,
          code: "ROUTE_NOT_FOUND",
          message: "The requested API route does not exist.",
          requestId: request.id
     }));

     server.register(fastifyCors, {
          origin: process.env.frontend_origin ?? false,
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
          allowedHeaders: ["Content-Type", "Authorization"],
          credentials: true
     });
     server.register(fastifyPostgres, dbConfig);
     server.register(fastifyCookies);

     server.decorateRequest("user", null);
     server.addHook("preHandler", async (request) => {
          const sessionId = request.cookies.session_id;

          request.user = sessionId === undefined
               ? null
               : { id: sessionId };
     });

     server.register(userRoutes, { prefix: "/api/users" });
     server.register(patientRoutes, { prefix: "/api/patients" });
     server.register(assessmentRoutes, { prefix: "/api/patients" });
     server.register(predictionRoutes, { prefix: "/api/predictions" });
     server.register(dashboardRoutes, { prefix: "/api/dashboard" });
     server.register(clinicianRoutes, { prefix: "/api/clinicians" });

     return server;
};

export {
     buildServer
};
