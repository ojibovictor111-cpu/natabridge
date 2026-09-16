import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import { ClientFacingError } from "../errors/api-error";
import { DEMO_USER_ID } from "../configs/demo-user";
import {
     createPatientAndProcessAssessment,
     processPatientAssessment,
     processPrediction
} from "../services/prediction/prediction.service";

const predictionBody = {
     age: 28,
     systolicBP: 120,
     diastolicBP: 80,
     bloodSugar: 6.2,
     bodyTemp: 37,
     heartRate: 78
};

const idPattern = (prefix: string) => new RegExp(`^${prefix}-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$`, "i");
const existingPatientId = "pat-00000000-0000-4000-8000-000000000002";

const aiResponse = {
     risk: "Low Risk",
     confidence: 0.82,
     probabilities: {
          "Low Risk": 0.82,
          "Mid Risk": 0.12,
          "High Risk": 0.06
     },
     topFactors: [
          { feature: "SystolicBP", impact: -0.42 }
     ],
     recommendations: [
          {
               feature: "SystolicBP",
               patientValue: 120,
               condition: "Within expected range",
               actions: ["Continue routine monitoring"],
               counselling: ["Attend scheduled antenatal visits"]
          }
     ],
     modelVersion: "1.0.0"
};

type QueryCall = {
     sql: string;
     values: unknown[];
};

class FakeClient {
     readonly calls: QueryCall[] = [];
     releaseCount = 0;
     patientFound = true;
     failOnPredictionResult = false;
     failOnAssessment = false;

     async query(sql: string, values: unknown[] = []) {
          this.calls.push({ sql, values });

          if (sql.includes("SELECT EXISTS")) {
               return {
                    rows: [{ exists: this.patientFound }],
                    rowCount: 1
               };
          }

          if (this.failOnPredictionResult && sql.includes("INSERT INTO prediction_results")) {
               throw new Error("prediction result storage failed");
          }

          if (this.failOnAssessment && sql.includes("INSERT INTO assessments")) {
               throw new Error("assessment storage failed");
          }

          if (sql.includes("INSERT INTO prediction_runs")) {
               return { rows: [{ id: values[0] }], rowCount: 1 };
          }

          if (sql.includes("INSERT INTO prediction_results")) {
               return { rows: [{ id: values[0] }], rowCount: 1 };
          }

          if (sql.includes("INSERT INTO assessments")) {
               return { rows: [{ id: values[0] }], rowCount: 1 };
          }

          if (sql.includes("SET status = 'completed'")) {
               return { rows: [{ id: values[0] }], rowCount: 1 };
          }

          return { rows: [], rowCount: 1 };
     }

     release() {
          this.releaseCount += 1;
     }
}

const createServer = (client: FakeClient) => ({
     pg: {
          connect: async () => client
     }
}) as unknown as FastifyInstance;

const mockSuccessfulAi = (context: test.TestContext) => {
     const originalFetch = globalThis.fetch;
     let callCount = 0;

     globalThis.fetch = async () => {
          callCount += 1;
          return new Response(JSON.stringify(aiResponse), {
               status: 200,
               headers: { "Content-Type": "application/json" }
          });
     };
     context.after(() => {
          globalThis.fetch = originalFetch;
     });

     return () => callCount;
};

test("standalone predictions persist without creating patients or assessments", async (context) => {
     const client = new FakeClient();
     const server = createServer(client);
     mockSuccessfulAi(context);

     const result = await processPrediction(server, predictionBody, "req-public");

     assert.match(result.predictionRunId, idPattern("pred-run"));
     assert.match(result.predictionResultId, idPattern("pred-res"));
     assert.equal("assessmentId" in result, false);
     assert.equal(result.prediction.risk, "Low Risk");

     const runInsert = client.calls.find((call) =>
          call.sql.includes("INSERT INTO prediction_runs")
     );
     const resultInsert = client.calls.find((call) =>
          call.sql.includes("INSERT INTO prediction_results")
     );

     assert.equal(runInsert?.values[1], "standalone");
     assert.equal(runInsert?.values[2], null);
     assert.equal(runInsert?.values[3], "req-public");
     assert.deepEqual(JSON.parse(String(resultInsert?.values[8])), aiResponse);
     const factorInsert = client.calls.find((call) =>
          call.sql.includes("INSERT INTO prediction_factors")
     );
     assert.match(factorInsert?.sql ?? "", /\$2::varchar\[\]/);
     assert.match(String((factorInsert?.values[1] as string[])[0]), idPattern("pred-fac"));
     assert.equal(client.calls.some((call) => call.sql.includes("INSERT INTO beneficiaries")), false);
     assert.equal(client.calls.some((call) => call.sql.includes("INSERT INTO mothers")), false);
     assert.equal(client.calls.some((call) => call.sql.includes("INSERT INTO assessments")), false);
});

test("one patient can receive repeated assessments without reinserting the patient", async (context) => {
     const client = new FakeClient();
     const server = createServer(client);
     const getAiCallCount = mockSuccessfulAi(context);
     const assessmentBody = {
          ...predictionBody,
          gestationalAge: 24,
          firstPregnancy: true,
          previousComplications: null
     };

     const first = await processPatientAssessment(
          server,
          existingPatientId,
          assessmentBody,
          DEMO_USER_ID,
          "req-clinical-1"
     );
     const second = await processPatientAssessment(
          server,
          existingPatientId,
          assessmentBody,
          DEMO_USER_ID,
          "req-clinical-2"
     );

     assert.equal(first.patientId, existingPatientId);
     assert.equal(second.patientId, existingPatientId);
     assert.match(String(first.assessmentId), idPattern("ass"));
     assert.match(first.predictionRunId, idPattern("pred-run"));
     assert.match(first.predictionResultId, idPattern("pred-res"));
     assert.notEqual(first.assessmentId, second.assessmentId);
     assert.equal(getAiCallCount(), 2);
     assert.equal(
          client.calls.filter((call) => call.sql.includes("INSERT INTO assessments")).length,
          2
     );
     assert.equal(client.calls.some((call) => call.sql.includes("INSERT INTO mothers")), false);
});

test("new patient and assessment persistence uses one transaction", async (context) => {
     const client = new FakeClient();
     const server = createServer(client);
     mockSuccessfulAi(context);

     const result = await createPatientAndProcessAssessment(
          server,
          {
               ...predictionBody,
               firstname: " Amina ",
               middlename: null,
               lastname: " Bello ",
               dob: "2000-01-01",
               email: "AMINA@EXAMPLE.COM",
               phone: null,
               gestationalAge: 24,
               firstPregnancy: true,
               previousComplications: null
          },
          DEMO_USER_ID,
          "req-new-patient"
     );

     assert.match(result.patientId, idPattern("pat"));
     assert.match(result.assessmentId, idPattern("ass"));
     assert.match(result.predictionRunId, idPattern("pred-run"));
     assert.match(result.predictionResultId, idPattern("pred-res"));
     assert.equal(client.calls.filter((call) => call.sql === "BEGIN").length, 1);
     assert.equal(client.calls.filter((call) => call.sql === "COMMIT").length, 1);
     assert.equal(client.calls.some((call) => call.sql === "ROLLBACK"), false);

     const beneficiaryInsert = client.calls.find((call) =>
          call.sql.includes("INSERT INTO beneficiaries")
     );
     const patientInsert = client.calls.find((call) =>
          call.sql.includes("INSERT INTO mothers")
     );
     const runInsert = client.calls.find((call) =>
          call.sql.includes("INSERT INTO prediction_runs")
     );

     assert.equal(beneficiaryInsert?.values[0], result.patientId);
     assert.equal(patientInsert?.values[0], result.patientId);
     assert.equal(patientInsert?.values[1], "Amina");
     assert.equal(patientInsert?.values[5], "amina@example.com");
     assert.equal(runInsert?.values[3], "req-new-patient");
     assert.equal(client.releaseCount, 1);
});

test("new patient creation rolls back when assessment persistence fails", async (context) => {
     const client = new FakeClient();
     client.failOnAssessment = true;
     const server = createServer(client);
     mockSuccessfulAi(context);

     await assert.rejects(
          createPatientAndProcessAssessment(
               server,
               {
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
               },
               DEMO_USER_ID
          ),
          /assessment storage failed/
     );

     assert.equal(
          client.calls.some((call) => call.sql.includes("INSERT INTO mothers")),
          true
     );
     assert.equal(client.calls.some((call) => call.sql === "ROLLBACK"), true);
     assert.equal(client.calls.some((call) => call.sql === "COMMIT"), false);
     assert.equal(client.releaseCount, 1);
});

test("new patient is not persisted when AI assessment fails", async (context) => {
     const originalFetch = globalThis.fetch;
     globalThis.fetch = async () => new Response(null, { status: 503 });
     context.after(() => {
          globalThis.fetch = originalFetch;
     });
     const client = new FakeClient();
     const server = createServer(client);

     await assert.rejects(
          createPatientAndProcessAssessment(
               server,
               {
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
               },
               DEMO_USER_ID
          ),
          (error: unknown) => error instanceof ClientFacingError
               && error.code === "PREDICTION_SERVICE_ERROR"
     );

     assert.equal(
          client.calls.some((call) => call.sql.includes("INSERT INTO mothers")),
          false
     );
     assert.equal(client.calls.some((call) => call.sql === "BEGIN"), false);
});

test("missing patients are rejected before a prediction run is created", async () => {
     const client = new FakeClient();
     client.patientFound = false;
     const server = createServer(client);

     await assert.rejects(
          processPatientAssessment(
               server,
               existingPatientId,
               {
                    ...predictionBody,
                    gestationalAge: null,
                    firstPregnancy: null,
                    previousComplications: null
               },
               DEMO_USER_ID
          ),
          (error: unknown) => error instanceof ClientFacingError
               && error.statusCode === 404
               && error.code === "PATIENT_NOT_FOUND"
     );

     assert.equal(client.calls.some((call) => call.sql.includes("INSERT INTO prediction_runs")), false);
});

test("AI failures leave a failed prediction-run audit record", async (context) => {
     const originalFetch = globalThis.fetch;
     globalThis.fetch = async () => new Response(null, { status: 503 });
     context.after(() => {
          globalThis.fetch = originalFetch;
     });
     const client = new FakeClient();
     const server = createServer(client);

     await assert.rejects(
          processPrediction(server, predictionBody),
          (error: unknown) => error instanceof ClientFacingError
               && error.statusCode === 502
               && error.code === "PREDICTION_SERVICE_ERROR"
     );

     const failedUpdate = client.calls.find((call) =>
          call.sql.includes("status = 'failed'")
     );
     assert.equal(failedUpdate?.values[1], "PREDICTION_SERVICE_ERROR");
     assert.equal(client.calls.some((call) => call.sql.includes("INSERT INTO prediction_results")), false);
});

test("invalid AI probabilities are rejected before result persistence", async (context) => {
     const originalFetch = globalThis.fetch;
     globalThis.fetch = async () => new Response(JSON.stringify({
          ...aiResponse,
          probabilities: {
               "Low Risk": 0.7,
               "Mid Risk": 0.2,
               "High Risk": 0.2
          }
     }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
     });
     context.after(() => {
          globalThis.fetch = originalFetch;
     });
     const client = new FakeClient();
     const server = createServer(client);

     await assert.rejects(
          processPrediction(server, predictionBody),
          (error: unknown) => error instanceof ClientFacingError
               && error.statusCode === 502
               && error.code === "PREDICTION_SERVICE_INVALID_RESPONSE"
     );

     assert.equal(
          client.calls.some((call) => call.sql.includes("INSERT INTO prediction_results")),
          false
     );
     assert.equal(
          client.calls.some((call) => call.sql.includes("status = 'failed'")),
          true
     );
});

test("malformed AI JSON is reported as an invalid response", async (context) => {
     const originalFetch = globalThis.fetch;
     globalThis.fetch = async () => new Response("not-json", {
          status: 200,
          headers: { "Content-Type": "application/json" }
     });
     context.after(() => {
          globalThis.fetch = originalFetch;
     });
     const client = new FakeClient();
     const server = createServer(client);

     await assert.rejects(
          processPrediction(server, predictionBody),
          (error: unknown) => error instanceof ClientFacingError
               && error.statusCode === 502
               && error.code === "PREDICTION_SERVICE_INVALID_RESPONSE"
     );

     assert.equal(
          client.calls.some((call) => call.sql.includes("status = 'failed'")),
          true
     );
});

test("prediction storage failures are not returned as successful predictions", async (context) => {
     const client = new FakeClient();
     client.failOnPredictionResult = true;
     const server = createServer(client);
     mockSuccessfulAi(context);

     await assert.rejects(
          processPrediction(server, predictionBody),
          /prediction result storage failed/
     );

     assert.equal(
          client.calls.some((call) => call.sql.includes("ROLLBACK")),
          true
     );
     assert.equal(
          client.calls.some((call) => call.sql.includes("status = 'failed'")),
          true
     );
});
