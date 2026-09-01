import assert from "node:assert/strict";
import test from "node:test";
import { buildServer } from "../server";

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

test("patient assessment route requires authentication", async (context) => {
     const server = buildServer({ logger: false });
     context.after(() => server.close());

     const response = await server.inject({
          method: "POST",
          url: "/api/patients/pat-example/assessments",
          payload: {
               ...predictionBody,
               gestationalAge: 24,
               firstPregnancy: true,
               previousComplications: null
          }
     });

     assert.equal(response.statusCode, 401);
     assert.equal(response.json().code, "AUTHENTICATION_REQUIRED");
});

test("new patient assessment route requires authentication", async (context) => {
     const server = buildServer({ logger: false });
     context.after(() => server.close());

     const response = await server.inject({
          method: "POST",
          url: "/api/patients/assessments",
          payload: {
               ...predictionBody,
               firstname: "Amina",
               middlename: null,
               lastname: "Bello",
               dob: "2000-01-01",
               email: "amina@example.com",
               phone: null,
               gestationalAge: 24,
               firstPregnancy: true,
               previousComplications: null
          }
     });

     assert.equal(response.statusCode, 401);
     assert.equal(response.json().code, "AUTHENTICATION_REQUIRED");
});

test("patient and dashboard reads require authentication", async (context) => {
     const server = buildServer({ logger: false });
     context.after(() => server.close());

     const [patientsResponse, dashboardResponse] = await Promise.all([
          server.inject({ method: "GET", url: "/api/patients" }),
          server.inject({ method: "GET", url: "/api/dashboard" })
     ]);

     assert.equal(patientsResponse.statusCode, 401);
     assert.equal(patientsResponse.json().code, "AUTHENTICATION_REQUIRED");
     assert.equal(dashboardResponse.statusCode, 401);
     assert.equal(dashboardResponse.json().code, "AUTHENTICATION_REQUIRED");
});

test("patient registration rejects whitespace-only names before persistence", async (context) => {
     const server = buildServer({ logger: false });
     context.after(() => server.close());

     const response = await server.inject({
          method: "POST",
          url: "/api/patients",
          headers: {
               cookie: "session_id=user-1"
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
