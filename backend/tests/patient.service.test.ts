import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import {
     fetchPatientsWithLatestAssessment,
     registerPatient
} from "../services/patient/patient.service";

class FakePatientClient {
     releaseCount = 0;
     readonly queries: string[] = [];
     readonly values: unknown[][] = [];

     async query(sql: string, values: unknown[] = []) {
          this.queries.push(sql);
          this.values.push(values);

          if (sql.includes("INSERT INTO mothers")) {
               return {
                    rows: [{
                         id: values[0],
                         firstname: "Amina",
                         middlename: null,
                         lastname: "Bello",
                         // Simulate pg parsing DATE in a positive local timezone.
                         dob: new Date("1999-12-31T23:00:00.000Z"),
                         email: "amina@example.com",
                         phone: null,
                         created_at: new Date("2026-08-10T12:00:00.000Z")
                    }],
                    rowCount: 1
               };
          }

          if (sql.includes("FROM mothers mother")) {
               return {
                    rows: [{
                         id: "pat-00000000-0000-4000-8000-000000000002",
                         name: "Amina Bello",
                         age: "26.00",
                         gestationalAge: "24.00",
                         firstPregnancy: false,
                         lastAssessment: new Date("2026-08-10T12:00:00.000Z"),
                         currentRiskLevel: "Low Risk"
                    }],
                    rowCount: 1
               };
          }

          return { rows: [], rowCount: 1 };
     }

     release() {
          this.releaseCount += 1;
     }
}

const createServer = (client: FakePatientClient) => ({
     pg: {
          connect: async () => client
     }
}) as unknown as FastifyInstance;

test("patient registration preserves the submitted calendar date", async () => {
     const client = new FakePatientClient();
     const patient = await registerPatient(createServer(client), {
          firstName: " Amina ",
          middleName: null,
          lastName: " Bello ",
          dob: "2000-01-01",
          email: "AMINA@EXAMPLE.COM",
          phone: null
     }, "inst-test", "usr-clinician");

     assert.equal(patient.dob, "2000-01-01");
     assert.equal(patient.email, "amina@example.com");
     assert.match(patient.id, /^pat-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
     const beneficiaryInsertIndex = client.queries.findIndex((sql) => sql.includes("INSERT INTO beneficiaries"));
     assert.equal(client.values[beneficiaryInsertIndex]?.[0], patient.id);
     assert.equal(client.queries.some((sql) => sql.includes("INSERT INTO beneficiaries")), true);
     assert.equal(client.queries.some((sql) => sql.includes("INSERT INTO mothers")), true);
     assert.equal(client.queries.some((sql) => sql.includes("INSERT INTO institutional_care")), true);
     assert.equal(client.releaseCount, 1);
});

test("patient summaries expose PostgreSQL numeric values as JSON numbers", async () => {
     const client = new FakePatientClient();
     const patients = await fetchPatientsWithLatestAssessment(createServer(client), "inst-test");

     assert.equal(patients[0]?.age, 26);
     assert.equal(patients[0]?.gestationalAge, 24);
     assert.equal(patients[0]?.firstPregnancy, false);
     assert.match(client.queries[0] ?? "", /assessment\.beneficiary_id = mother\.id/);
     assert.match(client.queries[0] ?? "", /AGE\(CURRENT_DATE, mother\.date_of_birth\)/);
     assert.match(client.queries[0] ?? "", /antenatal\.gestational_age_weeks/);
     assert.match(client.queries[0] ?? "", /pregnancy_history\.pregnancy_count/);
     assert.deepEqual(client.values[0], ["inst-test"]);
     assert.equal(client.releaseCount, 1);
});
