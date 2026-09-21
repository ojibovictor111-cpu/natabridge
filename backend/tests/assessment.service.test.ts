import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import { DEMO_USER_ID } from "../configs/demo-user";
import {
    fetchAssessmentById,
    fetchAssessments,
    fetchAssessmentsByClinician
} from "../services/assessment/assessment.service";

const assessmentRow = {
    assessment_id: "ass-00000000-0000-4000-8000-000000000003",
    clinician_id: DEMO_USER_ID,
    gestational_age: "24.00",
    first_pregnancy: true,
    previous_complications: null,
    assessed_at: new Date("2026-09-01T10:00:00.000Z"),
    patient_id: "pat-00000000-0000-4000-8000-000000000002",
    patient_firstname: "Amina",
    patient_middlename: null,
    patient_lastname: "Bello",
    patient_dob: "2000-01-01",
    patient_email: "amina@example.com",
    patient_phone: null,
    prediction_run_id: "pred-run-00000000-0000-4000-8000-000000000004",
    prediction_status: "completed",
    age: "26.00",
    systolic_bp: "120.00",
    diastolic_bp: "80.00",
    blood_sugar: "6.20",
    body_temperature_celsius: "37.00",
    heart_rate: "78.00",
    prediction_result_id: "pred-res-00000000-0000-4000-8000-000000000005",
    prediction: "Low Risk",
    confidence: "0.82000",
    low_risk_probability: "0.82000",
    mid_risk_probability: "0.12000",
    high_risk_probability: "0.06000",
    model_version: "1.0.0",
    response_payload: { risk: "Low Risk" },
    factors: [{ feature: "SystolicBP", impact: -0.42 }]
};

class FakeAssessmentClient {
    releaseCount = 0;
    queryValues: unknown[] = [];
    querySql = "";
    rows: typeof assessmentRow[] = [assessmentRow];

    async query(sql: string, values: unknown[] = []) {
        this.querySql = sql;
        this.queryValues = values;

        return {
            rows: this.rows,
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
        DEMO_USER_ID,
        "inst-test"
    );

    assert.deepEqual(client.queryValues, [DEMO_USER_ID, "inst-test"]);
    assert.match(client.querySql, /assessment\.created_by_user_id = \$1/);
    assert.match(client.querySql, /care\.institution_id = \$2/);
    assert.match(client.querySql, /mother\.id = assessment\.beneficiary_id/);
    assert.match(client.querySql, /mother\.date_of_birth::TEXT AS patient_dob/);
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

test("institution assessment list includes all accessible clinicians", async () => {
    const client = new FakeAssessmentClient();
    const assessments = await fetchAssessments(createServer(client), "inst-test");

    assert.deepEqual(client.queryValues, ["inst-test"]);
    assert.doesNotMatch(client.querySql, /assessment\.created_by_user_id = \$1/);
    assert.match(client.querySql, /care\.institution_id = \$1/);
    assert.equal(assessments[0]?.id, assessmentRow.assessment_id);
    assert.equal(client.releaseCount, 1);
});

test("assessment detail is scoped to the selected institution", async () => {
    const client = new FakeAssessmentClient();
    const assessment = await fetchAssessmentById(
        createServer(client), assessmentRow.assessment_id, "inst-test"
    );

    assert.deepEqual(client.queryValues, [assessmentRow.assessment_id, "inst-test"]);
    assert.match(client.querySql, /assessment\.id = \$1/);
    assert.match(client.querySql, /care\.institution_id = \$2/);
    assert.equal(assessment.prediction.risk, "Low Risk");
    assert.equal(client.releaseCount, 1);
});

test("assessment detail returns a descriptive 404 when inaccessible", async () => {
    const client = new FakeAssessmentClient();
    client.rows = [];

    await assert.rejects(
        fetchAssessmentById(createServer(client), "ass-missing", "inst-test"),
        { statusCode: 404, code: "ASSESSMENT_NOT_FOUND" }
    );
    assert.equal(client.releaseCount, 1);
});
