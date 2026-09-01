import { PoolClient } from "pg";
import type {
    AssessmentRepoInput,
    ClinicianAssessmentRow
} from "../../models/assessment/repo/assessment.repo";

const createAssessment = async (
    client: PoolClient,
    assessment: AssessmentRepoInput
) => {
    const result = await client.query(
        `
        INSERT INTO assessments (
            id,
            patient_id,
            prediction_run_id,
            created_by_user_id,
            gestational_age,
            first_pregnancy,
            previous_complications
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
        `,
        [
            assessment.id,
            assessment.patientId,
            assessment.predictionRunId,
            assessment.createdByUserId,
            assessment.gestationalAge,
            assessment.firstPregnancy,
            assessment.previousComplications
        ]
    );

    return result.rows[0] as { id: string };
};

const getAssessmentsByClinician = async (
    client: PoolClient,
    clinicianId: string
) => {
    const result = await client.query<ClinicianAssessmentRow>(
        `
        SELECT
            assessment.id AS assessment_id,
            assessment.created_by_user_id AS clinician_id,
            assessment.gestational_age,
            assessment.first_pregnancy,
            assessment.previous_complications,
            assessment.created_at AS assessed_at,

            patient.id AS patient_id,
            patient.firstname AS patient_firstname,
            patient.middlename AS patient_middlename,
            patient.lastname AS patient_lastname,
            patient.dob AS patient_dob,
            patient.email AS patient_email,
            patient.phone AS patient_phone,

            prediction_run.id AS prediction_run_id,
            prediction_run.status AS prediction_status,
            prediction_run.age,
            prediction_run.systolic_bp,
            prediction_run.diastolic_bp,
            prediction_run.blood_sugar,
            prediction_run.body_temperature_celsius,
            prediction_run.heart_rate,

            prediction_result.id AS prediction_result_id,
            prediction_result.prediction,
            prediction_result.confidence,
            prediction_result.low_risk_probability,
            prediction_result.mid_risk_probability,
            prediction_result.high_risk_probability,
            prediction_result.model_version,
            prediction_result.response_payload,
            COALESCE(
                (
                    SELECT JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'feature', prediction_factor.feature,
                            'impact', prediction_factor.impact
                        )
                        ORDER BY ABS(prediction_factor.impact) DESC
                    )
                    FROM prediction_factors prediction_factor
                    WHERE prediction_factor.prediction_result_id = prediction_result.id
                ),
                '[]'::JSON
            ) AS factors
        FROM assessments assessment
        INNER JOIN patients patient
            ON patient.id = assessment.patient_id
        INNER JOIN prediction_runs prediction_run
            ON prediction_run.id = assessment.prediction_run_id
        LEFT JOIN prediction_results prediction_result
            ON prediction_result.prediction_run_id = prediction_run.id
        WHERE assessment.created_by_user_id = $1
        ORDER BY assessment.created_at DESC, assessment.id DESC
        `,
        [clinicianId]
    );

    return result.rows;
};

export {
    createAssessment,
    getAssessmentsByClinician
};
