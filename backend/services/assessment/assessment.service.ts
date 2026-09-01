import type { FastifyInstance } from "fastify";
import { getAssessmentsByClinician } from "../../repositories/assessment/assessment.repo";

const toNumberOrNull = (value: string | number | null) =>
    value === null ? null : Number(value);

const fetchAssessmentsByClinician = async (
    server: FastifyInstance,
    clinicianId: string
) => {
    const client = await server.pg.connect();

    try {
        const assessments = await getAssessmentsByClinician(client, clinicianId);

        return assessments.map((assessment) => ({
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
                factors: Array.isArray(assessment.factors)
                    ? assessment.factors
                    : []
            }
        }));
    } finally {
        client.release();
    }
};

export {
    createPatientAndProcessAssessment,
    processPatientAssessment
} from "../prediction/prediction.service";

export {
    fetchAssessmentsByClinician
};
