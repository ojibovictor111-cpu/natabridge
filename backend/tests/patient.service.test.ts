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

     async query(sql: string) {
          this.queries.push(sql);

          if (sql.includes("INSERT INTO mothers")) {
               return {
                    rows: [{
                         id: "pat-created",
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
                         id: "pat-created",
                         name: "Amina Bello",
                         age: "26.00",
                         gestationalAge: "24.00",
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
     });

     assert.equal(patient.dob, "2000-01-01");
     assert.equal(patient.email, "amina@example.com");
     assert.equal(client.queries.some((sql) => sql.includes("INSERT INTO beneficiaries")), true);
     assert.equal(client.queries.some((sql) => sql.includes("INSERT INTO mothers")), true);
     assert.equal(client.releaseCount, 1);
});

test("patient summaries expose PostgreSQL numeric values as JSON numbers", async () => {
     const client = new FakePatientClient();
     const patients = await fetchPatientsWithLatestAssessment(createServer(client));

     assert.equal(patients[0]?.age, 26);
     assert.equal(patients[0]?.gestationalAge, 24);
     assert.match(client.queries[0] ?? "", /assessment\.beneficiary_id = mother\.id/);
     assert.equal(client.releaseCount, 1);
});
