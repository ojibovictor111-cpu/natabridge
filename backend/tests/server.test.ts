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

test("protected operations use the temporary demo actor without a session", () => {
     const request = {
          user: null
     } as unknown as FastifyRequest;

     assert.equal(requireAuthenticatedUserId(request), DEMO_USER_ID);
     request.user = { id: "not-a-uuid" };
     assert.equal(requireAuthenticatedUserId(request), DEMO_USER_ID);
});

test("production login sets a cross-site session cookie for valid demo credentials", async (context) => {
     const originalFrontendOrigin = process.env.frontend_origin;
     process.env.frontend_origin = "https://natabridge-om17.onrender.com";
     context.after(() => {
          if (originalFrontendOrigin === undefined) {
               delete process.env.frontend_origin;
          } else {
               process.env.frontend_origin = originalFrontendOrigin;
          }
     });

     const server = buildServer({ logger: false });
     context.after(() => server.close());
     const response = await server.inject({
          method: "POST",
          url: "/api/users/login",
          payload: {
               id: "jane@natabridge.com",
               password: "12345"
          }
     });

     assert.equal(response.statusCode, 200);
     assert.equal(response.json().data.email, "jane@natabridge.com");
     assert.equal(response.json().data.id, DEMO_USER_ID);
     assert.match(String(response.headers["set-cookie"]), new RegExp(`session_id=${DEMO_USER_ID}`));
     assert.match(String(response.headers["set-cookie"]), /HttpOnly/i);
     assert.match(String(response.headers["set-cookie"]), /SameSite=None/i);
     assert.match(String(response.headers["set-cookie"]), /Secure/i);
});

test("login rejects invalid demo credentials without setting a cookie", async (context) => {
     const server = buildServer({ logger: false });
     context.after(() => server.close());
     const response = await server.inject({
          method: "POST",
          url: "/api/users/login",
          payload: {
               id: "jane@natabridge.com",
               password: "wrong-password"
          }
     });

     assert.equal(response.statusCode, 401);
     assert.equal(response.json().code, "INVALID_CREDENTIALS");
     assert.equal(response.headers["set-cookie"], undefined);
});

test("patient registration rejects whitespace-only names before persistence", async (context) => {
     const server = buildServer({ logger: false });
     context.after(() => server.close());

     const response = await server.inject({
          method: "POST",
          url: "/api/patients",
          headers: {
               cookie: `session_id=${DEMO_USER_ID}`
          },
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
