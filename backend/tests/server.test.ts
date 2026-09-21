import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyRequest } from "fastify";
import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import { DEMO_USER_ID } from "../configs/demo-user";
import {
     clinicianAssessmentParamsSchema,
     patientAssessmentParamsSchema
} from "../models/assessment/dto/assessment.dto";
import { patientParamsSchema } from "../models/patient/dto/patient.dto";
import { buildServer } from "../server";
import { requireAuthenticatedUserId } from "../utils/auth";
import { findUserByFirebaseUid } from "../utils/firebase-auth";

const predictionBody = {
     age: 28,
     systolicBP: 120,
     diastolicBP: 80,
     bloodSugar: 6.2,
     bodyTemp: 37,
     heartRate: 78
};

test("public prediction route rejects demographic fields", async (context) => {
     const server = buildServer({ logger: false });
     context.after(() => server.close());

     const response = await server.inject({
          method: "POST",
          url: "/api/predictions",
          payload: {
               ...predictionBody,
               email: "patient@example.com"
          }
     });

     assert.equal(response.statusCode, 400);
     assert.equal(response.json().code, "VALIDATION_ERROR");
});

test("public prediction route validates Celsius inputs before persistence", async (context) => {
     const server = buildServer({ logger: false });
     context.after(() => server.close());

     const response = await server.inject({
          method: "POST",
          url: "/api/predictions",
          payload: {
               ...predictionBody,
               bodyTemp: 98.6
          }
     });

     assert.equal(response.statusCode, 400);
     assert.equal(response.json().code, "VALIDATION_ERROR");
});

test("protected operations require an authenticated actor", () => {
     const request = {
          user: null
     } as unknown as FastifyRequest;

     assert.throws(() => requireAuthenticatedUserId(request), {
          statusCode: 401,
          code: "AUTHENTICATION_REQUIRED"
     });
     request.user = { id: "usr-clinician", email: "jane@natabridge.com", firebaseUid: "firebase-uid" };
     assert.equal(requireAuthenticatedUserId(request), "usr-clinician");
});

test("demo login has been removed", async (context) => {
     const server = buildServer({ logger: false });
     context.after(() => server.close());
     const response = await server.inject({
          method: "POST",
          url: "/api/users/login"
     });

     assert.equal(response.statusCode, 404);
     assert.equal(response.json().code, "ROUTE_NOT_FOUND");
});

test("protected routes reject missing, malformed, and invalid Bearer tokens", async (context) => {
     let verifyCalls = 0;
     const server = buildServer({
          logger: false,
          verifyIdToken: async () => {
               verifyCalls++;
               throw { code: "auth/invalid-id-token" };
          },
          findUserByFirebaseUid: async () => {
               throw new Error("database must not be queried");
          }
     });
     context.after(() => server.close());

     for (const url of ["/api/patients", "/api/dashboard", "/api/clinicians/id/assessments", "/api/users"]) {
          const response = await server.inject({ method: "GET", url });
          assert.equal(response.statusCode, 401, url);
          assert.equal(response.json().code, "AUTHENTICATION_REQUIRED", url);
     }

     const cookieOnly = await server.inject({
          method: "GET",
          url: "/api/patients",
          headers: { cookie: `session_id=${DEMO_USER_ID}` }
     });
     assert.equal(cookieOnly.statusCode, 401);

     const malformed = await server.inject({
          method: "GET",
          url: "/api/patients",
          headers: { authorization: "Basic token" }
     });
     assert.equal(malformed.statusCode, 401);

     const invalid = await server.inject({
          method: "GET",
          url: "/api/patients",
          headers: { authorization: "Bearer invalid-token" }
     });
     assert.equal(invalid.statusCode, 401);
     assert.equal(invalid.json().code, "INVALID_ID_TOKEN");
     assert.equal(verifyCalls, 1);
});

test("Firebase verification outages are reported as server errors", async (context) => {
     const server = buildServer({
          logger: false,
          verifyIdToken: async () => {
               throw Object.assign(new Error("network unavailable"), { code: "app/network-error" });
          }
     });
     context.after(() => server.close());

     const response = await server.inject({
          method: "GET",
          url: "/api/users/me",
          headers: { authorization: "Bearer firebase-uid" }
     });

     assert.equal(response.statusCode, 500);
     assert.equal(response.json().code, "INTERNAL_SERVER_ERROR");
});

test("verified Firebase UID must map to an active user", async (context) => {
     const lookedUpUids: string[] = [];
     let status: "ACTIVE" | "SUSPENDED" | null = null;
     const server = buildServer({
          logger: false,
          verifyIdToken: async (token) => ({ uid: token }),
          findUserByFirebaseUid: async (_request, uid) => {
               lookedUpUids.push(uid);
               return status === null ? null : { id: "usr-clinician", email: "jane@natabridge.com", status };
          },
          findUserAccess: async () => ({
               roles: [{
                    id: "rol-clinician",
                    name: "CLINICIAN",
                    scope: "CLINICAL",
                    institutionId: "inst-test",
                    permissions: ["clinical.assessments.read", "clinical.predictions.run"]
               }]
          })
     });
     context.after(() => server.close());

     const call = () => server.inject({
          method: "GET",
          url: "/api/users/me",
          headers: { authorization: "Bearer firebase-uid" }
     });

     const unknown = await call();
     assert.equal(unknown.statusCode, 403);
     assert.equal(unknown.json().code, "USER_NOT_PROVISIONED");

     status = "SUSPENDED";
     const suspended = await call();
     assert.equal(suspended.statusCode, 403);
     assert.equal(suspended.json().code, "USER_INACTIVE");

     status = "ACTIVE";
     const active = await call();
     assert.equal(active.statusCode, 200);
     assert.deepEqual(active.json().data, {
          id: "usr-clinician",
          email: "jane@natabridge.com",
          roles: [{
               id: "rol-clinician",
               name: "CLINICIAN",
               scope: "CLINICAL",
               institutionId: "inst-test",
               permissions: ["clinical.assessments.read", "clinical.predictions.run"]
          }]
     });
     assert.deepEqual(lookedUpUids, ["firebase-uid", "firebase-uid", "firebase-uid"]);
});

test("Firebase UID lookup uses the verified UID as a query parameter", async () => {
     let query: string | undefined;
     let values: unknown[] | undefined;
     const request = {
          server: {
               pg: {
                    query: async (sql: string, parameters: unknown[]) => {
                         query = sql;
                         values = parameters;
                         return { rows: [{ id: "usr-clinician", email: "jane@natabridge.com", status: "ACTIVE" }] };
                    }
               }
          }
     } as unknown as FastifyRequest;

     const user = await findUserByFirebaseUid(request, "firebase-uid' OR TRUE --");
     assert.deepEqual(user, { id: "usr-clinician", email: "jane@natabridge.com", status: "ACTIVE" });
     assert.equal(query, "SELECT id, email, status FROM users WHERE firebase_uid = $1");
     assert.deepEqual(values, ["firebase-uid' OR TRUE --"]);
});

test("a clinician cannot request another clinician's assessments", async (context) => {
     const server = buildServer({
          logger: false,
          verifyIdToken: async () => ({ uid: "firebase-uid" }),
          findUserByFirebaseUid: async () => ({
               id: "usr-clinician",
               email: "jane@natabridge.com",
               status: "ACTIVE"
          }),
          findPermissionGrants: async () => [{
               name: "clinical.assessments.read",
               scope: "CLINICAL",
               institution_id: "inst-test"
          }]
     });
     context.after(() => server.close());

     const response = await server.inject({
          method: "GET",
          url: "/api/clinicians/usr-other/assessments",
          headers: { authorization: "Bearer firebase-uid" }
     });

     assert.equal(response.statusCode, 403);
     assert.equal(response.json().code, "FORBIDDEN");
});

test("CORS preflight for a protected route does not require a token", async (context) => {
     const originalFrontendOrigin = process.env.frontend_origin;
     process.env.frontend_origin = "https://natabridge.example";
     context.after(() => {
          if (originalFrontendOrigin === undefined) delete process.env.frontend_origin;
          else process.env.frontend_origin = originalFrontendOrigin;
     });

     const server = buildServer({ logger: false });
     context.after(() => server.close());
     const response = await server.inject({
          method: "OPTIONS",
          url: "/api/users/me",
          headers: {
               origin: "https://natabridge.example",
               "access-control-request-method": "GET",
               "access-control-request-headers": "authorization"
          }
     });

     assert.equal(response.statusCode, 204);
     assert.equal(response.headers["access-control-allow-origin"], "https://natabridge.example");
     assert.match(String(response.headers["access-control-allow-headers"]), /Authorization/i);
});

test("patient registration rejects whitespace-only names before persistence", async (context) => {
     const server = buildServer({
          logger: false,
          verifyIdToken: async () => ({ uid: "firebase-uid" }),
          findUserByFirebaseUid: async () => ({ id: "usr-clinician", email: "jane@natabridge.com", status: "ACTIVE" })
     });
     context.after(() => server.close());

     const response = await server.inject({
          method: "POST",
          url: "/api/patients",
          headers: { authorization: "Bearer firebase-uid" },
          payload: {
               firstName: "   ",
               middleName: null,
               lastName: "Bello",
               dob: "2000-01-01",
               email: "amina@example.com",
               phone: null
          }
     });

     assert.equal(response.statusCode, 400);
     assert.equal(response.json().code, "VALIDATION_ERROR");
});

test("the ambiguous legacy assessment route has been removed", async (context) => {
     const server = buildServer({ logger: false });
     context.after(() => server.close());

     const response = await server.inject({
          method: "POST",
          url: "/api/assessments",
          payload: predictionBody
     });

     assert.equal(response.statusCode, 404);
     assert.equal(response.json().code, "ROUTE_NOT_FOUND");
});

test("patient and clinician ID DTOs accept opaque IDs within the length limit", () => {
     const hasError = (result: unknown) =>
          typeof result === "object" && result !== null
          && "error" in result && result.error !== undefined;
     const cases = [
          { schema: patientParamsSchema, field: "patientId" },
          { schema: patientAssessmentParamsSchema, field: "patientId" },
          { schema: clinicianAssessmentParamsSchema, field: "clinicianId" }
     ];

     for (const { schema, field } of cases) {
          const validate = TypeBoxValidatorCompiler({
               schema,
               method: "GET",
               url: "/",
               httpPart: "params"
          });

          assert.equal(hasError(validate({ [field]: "opaque-id" })), false);
          assert.equal(hasError(validate({ [field]: "x".repeat(100) })), false);
          assert.equal(hasError(validate({ [field]: "x".repeat(101) })), true);
     }
});
