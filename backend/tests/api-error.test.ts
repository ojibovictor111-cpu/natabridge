import assert from "node:assert/strict";
import test from "node:test";
import { fastify } from "fastify";
import {
     apiErrorHandler,
     ClientFacingError,
     createApiErrorResponse
} from "../errors/api-error";

test("maps duplicate patient emails to a descriptive 409 response", () => {
     const databaseError = Object.assign(new Error("duplicate key"), {
          code: "23505",
          constraint: "mothers_email_case_insensitive_unique",
          detail: "Key (email)=(private@example.com) already exists."
     });

     const response = createApiErrorResponse(databaseError, "req-9");

     assert.deepEqual(response, {
          statusCode: 409,
          code: "PATIENT_EMAIL_ALREADY_EXISTS",
          message: "A patient with this email address already exists.",
          field: "email",
          requestId: "req-9"
     });
     assert.doesNotMatch(JSON.stringify(response), /private@example\.com|mothers_email_case_insensitive_unique|duplicate key/);
});

test("maps duplicate patient phone numbers to a descriptive 409 response", () => {
     const databaseError = Object.assign(new Error("duplicate key"), {
          code: "23505",
          constraint: "mothers_phone_unique"
     });

     assert.deepEqual(createApiErrorResponse(databaseError), {
          statusCode: 409,
          code: "PATIENT_PHONE_ALREADY_EXISTS",
          message: "A patient with this phone number already exists.",
          field: "phone"
     });
});

test("sanitizes unknown unique constraint errors", () => {
     const databaseError = Object.assign(new Error("duplicate secret"), {
          code: "23505",
          constraint: "private_constraint",
          detail: "sensitive database detail"
     });

     assert.deepEqual(createApiErrorResponse(databaseError), {
          statusCode: 409,
          code: "RESOURCE_ALREADY_EXISTS",
          message: "A record with the provided details already exists."
     });
});

test("returns declared client-facing service errors", () => {
     const error = new ClientFacingError({
          statusCode: 502,
          code: "PREDICTION_SERVICE_UNAVAILABLE",
          message: "The risk prediction service is temporarily unavailable."
     });

     assert.deepEqual(createApiErrorResponse(error), {
          statusCode: 502,
          code: "PREDICTION_SERVICE_UNAVAILABLE",
          message: "The risk prediction service is temporarily unavailable."
     });
});

test("preserves descriptive Fastify client errors", () => {
     const validationError = Object.assign(new Error("body/age must be <= 70"), {
          statusCode: 400,
          code: "FST_ERR_VALIDATION",
          validation: [{ keyword: "maximum" }]
     });

     assert.deepEqual(createApiErrorResponse(validationError), {
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message: "body/age must be <= 70"
     });
});

test("sanitizes undeclared 4xx error messages", () => {
     const dependencyError = Object.assign(new Error("token=private-value"), {
          statusCode: 400,
          code: "DEPENDENCY_ERROR"
     });

     assert.deepEqual(createApiErrorResponse(dependencyError), {
          statusCode: 400,
          code: "REQUEST_ERROR",
          message: "The request could not be completed."
     });
});

test("does not expose unexpected internal error details", () => {
     const response = createApiErrorResponse(
          new Error("password=secret; SELECT * FROM private_table")
     );

     assert.deepEqual(response, {
          statusCode: 500,
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while processing the request. Please try again."
     });
     assert.doesNotMatch(JSON.stringify(response), /password|SELECT|private_table/);
});

test("Fastify sends the mapped duplicate response through the global handler", async () => {
     const server = fastify({ logger: false });
     server.setErrorHandler(apiErrorHandler);
     server.get("/duplicate", async () => {
          throw Object.assign(new Error("duplicate key"), {
               code: "23505",
               constraint: "mothers_email_case_insensitive_unique",
               detail: "Key (email)=(private@example.com) already exists."
          });
     });

     const response = await server.inject({
          method: "GET",
          url: "/duplicate"
     });

     assert.equal(response.statusCode, 409);
     assert.deepEqual(response.json(), {
          statusCode: 409,
          code: "PATIENT_EMAIL_ALREADY_EXISTS",
          message: "A patient with this email address already exists.",
          field: "email",
          requestId: response.json().requestId
     });
     assert.equal(typeof response.json().requestId, "string");
     assert.doesNotMatch(response.body, /private@example\.com|mothers_email_case_insensitive_unique|duplicate key/);

     await server.close();
});
