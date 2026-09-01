import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import { fetchAssessmentsByClinician } from "../services/assessment/assessment.service";

class FakeAssessmentClient {
    releaseCount = 0;
    queryValues: unknown[] = [];
    querySql = "";

    async query(sql: string, values: unknown[] = []) {
        this.querySql = sql;
        this.queryValues = values;

        return {
            rows: [{
                assessment_id: "ass-1",
                clinician_id: "clinician-1",
                gestational_age: "24.00",
                first_pregnancy: true,
                previous_complications: null,
                assessed_at: new Date("2026-09-01T10:00:00.000Z"),
                patient_id: "pat-1",
                patient_firstname: "Amina",
                patient_middlename: null,
                patient_lastname: "Bello",
                patient_dob: "2000-01-01",
                patient_email: "amina@example.com",
                patient_phone: null,
                prediction_run_id: "pred-run-1",
                prediction_status: "completed",
                age: "26.00",
                systolic_bp: "120.00",
                diastolic_bp: "80.00",
                blood_sugar: "6.20",
                body_temperature_celsius: "37.00",
                heart_rate: "78.00",
                prediction_result_id: "pred-res-1",
                prediction: "Low Risk",
                confidence: "0.82000",
                low_risk_probability: "0.82000",
                mid_risk_probability: "0.12000",
                high_risk_probability: "0.06000",
                model_version: "1.0.0",
                response_payload: { risk: "Low Risk" },
                factors: [{ feature: "SystolicBP", impact: -0.42 }]
            }],
            rowCount: 1
        };
    }

    release() {
        this.releaseCount += 1;
    }
}

const createServer = (client: FakeAssessmentClient) => ({
    pg: {
        connect: async () => client
    }
}) as unknown as FastifyInstance;

test("clinician assessments are filtered and normalized", async () => {
    const client = new FakeAssessmentClient();
    const assessments = await fetchAssessmentsByClinician(
        createServer(client),
        "clinician-1"
    );

    assert.deepEqual(client.queryValues, ["clinician-1"]);
    assert.match(client.querySql, /assessment\.created_by_user_id = \$1/);
    assert.match(client.querySql, /ORDER BY assessment\.created_at DESC/);
    assert.equal(assessments[0]?.patient.firstName, "Amina");
    assert.equal(assessments[0]?.measurements.bloodSugar, 6.2);
    assert.equal(assessments[0]?.clinicalContext.gestationalAge, 24);
    assert.equal(assessments[0]?.prediction.confidence, 0.82);
    assert.deepEqual(assessments[0]?.prediction.factors, [
        { feature: "SystolicBP", impact: -0.42 }
    ]);
    assert.equal(client.releaseCount, 1);
});
