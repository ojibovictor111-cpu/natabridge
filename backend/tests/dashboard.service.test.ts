import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import { getDashboard } from "../services/dashboard/dashboard.service";

test("dashboard reads the latest completed assessment for each mother without legacy views", async () => {
     let querySql = "";
     let releaseCount = 0;
     const client = {
          async query(sql: string) {
               querySql = sql;
               return {
                    rows: [{
                         assessment_id: "assessment-1",
                         patient_id: "mother-1",
                         name: "Amina Bello",
                         age: "28.00",
                         gestational_age: "24.00",
                         prediction: "High Risk",
                         confidence: "0.82",
                         created_at: new Date("2026-09-16T10:00:00.000Z"),
                         systolic_bp: "120.00",
                         diastolic_bp: "80.00",
                         blood_sugar: "6.20",
                         body_temperature_celsius: "37.00",
                         heart_rate: "78.00",
                         factors: [{ feature: "SystolicBP", impact: "0.42" }]
                    }]
               };
          },
          release() {
               releaseCount += 1;
          }
     };
     const server = {
          pg: { connect: async () => client }
     } as unknown as FastifyInstance;

     const result = await getDashboard(server);

     assert.match(querySql, /DISTINCT ON \(assessment\.beneficiary_id\)/);
     assert.match(querySql, /INNER JOIN mothers mother/);
     assert.match(querySql, /prediction_run\.status = 'completed'/);
     assert.doesNotMatch(querySql, /get_dashboard_details|\bpatients\b/);
     assert.equal(result.summary.high, 1);
     assert.equal(result.recentAssessments[0]?.patientId, "mother-1");
     assert.equal(result.recentAssessments[0]?.bloodSugar, 6.2);
     assert.deepEqual(result.recentAssessments[0]?.factors, [
          { feature: "SystolicBP", impact: 0.42 }
     ]);
     assert.equal(releaseCount, 1);
});
