import type { FastifyInstance } from "fastify";
import {
    getAssessmentById,
    getAssessmentsByClinician,
    getAssessmentsByInstitution
} from "../../repositories/assessment/assessment.repo";
import type { ClinicianAssessmentRow } from "../../models/assessment/repo/assessment.repo";
import { ClientFacingError } from "../../errors/api-error";

const toNumberOrNull = (value: string | number | null) =>
    value === null ? null : Number(value);

const toAssessment = (assessment: ClinicianAssessmentRow) => ({
    id: assessment.assessment_id,
    clinicianId: assessment.clinician_id,
    assessedAt: assessment.assessed_at,
    patient: {
        id: assessment.patient_id,
        firstName: assessment.patient_firstname,
        middleName: assessment.patient_middlename,
        lastName: assessment.patient_lastname,
        dob: assessment.patient_dob,
        email: assessment.patient_email,
        phone: assessment.patient_phone
    },
    clinicalContext: {
        gestationalAge: toNumberOrNull(assessment.gestational_age),
        firstPregnancy: assessment.first_pregnancy,
        previousComplications: assessment.previous_complications
    },
    measurements: {
        age: Number(assessment.age),
        systolicBP: Number(assessment.systolic_bp),
        diastolicBP: Number(assessment.diastolic_bp),
        bloodSugar: Number(assessment.blood_sugar),
        bodyTemp: Number(assessment.body_temperature_celsius),
        heartRate: Number(assessment.heart_rate)
    },
    prediction: {
        runId: assessment.prediction_run_id,
        resultId: assessment.prediction_result_id,
        status: assessment.prediction_status,
        risk: assessment.prediction,
        confidence: toNumberOrNull(assessment.confidence),
        probabilities: {
            lowRisk: toNumberOrNull(assessment.low_risk_probability),
            midRisk: toNumberOrNull(assessment.mid_risk_probability),
            highRisk: toNumberOrNull(assessment.high_risk_probability)
        },
        modelVersion: assessment.model_version,
        response: assessment.response_payload,
        factors: Array.isArray(assessment.factors) ? assessment.factors : []
    }
});

const fetchAssessmentsByClinician = async (
    server: FastifyInstance,
    clinicianId: string,
    institutionId: string
) => {
    const client = await server.pg.connect();

    try {
        const assessments = await getAssessmentsByClinician(client, clinicianId, institutionId);

        return assessments.map(toAssessment);
    } finally {
        client.release();
    }
};

const fetchAssessments = async (server: FastifyInstance, institutionId: string) => {
    const client = await server.pg.connect();
    try {
        return (await getAssessmentsByInstitution(client, institutionId)).map(toAssessment);
    } finally {
        client.release();
    }
};

const fetchAssessmentById = async (
    server: FastifyInstance,
    assessmentId: string,
    institutionId: string
) => {
    const client = await server.pg.connect();
    try {
        const assessment = await getAssessmentById(client, assessmentId, institutionId);
        if (assessment === undefined) {
            throw new ClientFacingError({
                statusCode: 404,
                code: "ASSESSMENT_NOT_FOUND",
                message: "The selected assessment does not exist."
            });
        }
        return toAssessment(assessment);
    } finally {
        client.release();
    }
};

export {
    createPatientAndProcessAssessment,
    processPatientAssessment
} from "../prediction/prediction.service";

export {
    fetchAssessmentById,
    fetchAssessments,
    fetchAssessmentsByClinician
};
