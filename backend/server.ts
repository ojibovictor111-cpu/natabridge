import fastifyCors from "@fastify/cors";
import { fastifyPostgres } from "@fastify/postgres";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { fastify } from "fastify";
import { dbConfig } from "./configs/db.config";
import { apiErrorHandler } from "./errors/api-error";
import { assessmentReadRoutes, assessmentRoutes } from "./routes/assessment/assessment.route";
import { dashboardRoutes } from "./routes/dashboard/dashboard.route";
import { clinicianRoutes } from "./routes/clinician/clinician.route";
import { patientRoutes } from "./routes/patient/patient.route";
import { predictionRoutes } from "./routes/prediction/prediction.route";
import { userRoutes } from "./routes/user/user.route";
import { createFirebaseAuthHook } from "./utils/firebase-auth";
import type { FindUserByFirebaseUid, VerifyIdToken } from "./utils/firebase-auth";
import { createPermissionHook } from "./utils/permissions";
import type { FindPermissionGrants } from "./utils/permissions";
import { findUserAccess } from "./services/user/user-access.service";
import type { FindUserAccess } from "./services/user/user-access.service";

type BuildServerOptions = {
     logger?: boolean;
     verifyIdToken?: VerifyIdToken;
     findUserByFirebaseUid?: FindUserByFirebaseUid;
     findPermissionGrants?: FindPermissionGrants;
     findUserAccess?: FindUserAccess;
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
          allowedHeaders: ["Content-Type", "Authorization", "X-Institution-Id"],
     });
     server.register(fastifyPostgres, dbConfig);

     server.decorateRequest("user", null);
     server.decorateRequest("institutionId", null);
     server.decorate("findUserAccess", options.findUserAccess ?? findUserAccess);
     server.register(predictionRoutes, { prefix: "/api/predictions" });
     server.register(async (protectedApi) => {
          protectedApi.addHook("onRequest", createFirebaseAuthHook(
               options.verifyIdToken,
               options.findUserByFirebaseUid
          ));
          protectedApi.decorate("requirePermissions", (permissions: readonly string[]) =>
               createPermissionHook(permissions, options.findPermissionGrants));
          protectedApi.register(userRoutes, { prefix: "/api/users" });
          protectedApi.register(patientRoutes, { prefix: "/api/patients" });
          protectedApi.register(assessmentRoutes, { prefix: "/api/patients" });
          protectedApi.register(assessmentReadRoutes, { prefix: "/api/assessments" });
          protectedApi.register(dashboardRoutes, { prefix: "/api/dashboard" });
          protectedApi.register(clinicianRoutes, { prefix: "/api/clinicians" });
     });

     return server;
};

export {
     buildServer
};
