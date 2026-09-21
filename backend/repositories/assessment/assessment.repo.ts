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
            beneficiary_id,
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

const assessmentSelectQuery = `
    SELECT
        assessment.id AS assessment_id,
        assessment.created_by_user_id AS clinician_id,
        assessment.gestational_age,
        assessment.first_pregnancy,
        assessment.previous_complications,
        assessment.created_at AS assessed_at,

        mother.id AS patient_id,
        mother.firstname AS patient_firstname,
        mother.middlename AS patient_middlename,
        mother.lastname AS patient_lastname,
        mother.date_of_birth::TEXT AS patient_dob,
        mother.email AS patient_email,
        mother.phone AS patient_phone,

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
    INNER JOIN mothers mother
        ON mother.id = assessment.beneficiary_id
    INNER JOIN prediction_runs prediction_run
        ON prediction_run.id = assessment.prediction_run_id
    LEFT JOIN prediction_results prediction_result
        ON prediction_result.prediction_run_id = prediction_run.id
`;

const getAssessmentsByClinician = async (
    client: PoolClient,
    clinicianId: string,
    institutionId: string
) => {
    const result = await client.query<ClinicianAssessmentRow>(
        `${assessmentSelectQuery}
        WHERE assessment.created_by_user_id = $1
          AND EXISTS (
              SELECT 1 FROM institutional_care care
              WHERE care.beneficiary_id = assessment.beneficiary_id
                AND care.institution_id = $2
                AND care.status = 'ACTIVE'
                AND care.ended_at IS NULL
          )
        ORDER BY assessment.created_at DESC, assessment.id DESC
        `,
        [clinicianId, institutionId]
    );

    return result.rows;
};

const getAssessmentsByInstitution = async (
    client: PoolClient,
    institutionId: string
) => {
    const result = await client.query<ClinicianAssessmentRow>(
        `${assessmentSelectQuery}
        WHERE EXISTS (
            SELECT 1 FROM institutional_care care
            WHERE care.beneficiary_id = assessment.beneficiary_id
              AND care.institution_id = $1
              AND care.status = 'ACTIVE'
              AND care.ended_at IS NULL
        )
        ORDER BY assessment.created_at DESC, assessment.id DESC`,
        [institutionId]
    );
    return result.rows;
};

const getAssessmentById = async (
    client: PoolClient,
    assessmentId: string,
    institutionId: string
) => {
    const result = await client.query<ClinicianAssessmentRow>(
        `${assessmentSelectQuery}
        WHERE assessment.id = $1
          AND EXISTS (
              SELECT 1 FROM institutional_care care
              WHERE care.beneficiary_id = assessment.beneficiary_id
                AND care.institution_id = $2
                AND care.status = 'ACTIVE'
                AND care.ended_at IS NULL
          )
        LIMIT 1`,
        [assessmentId, institutionId]
    );
    return result.rows[0];
};

export {
    createAssessment,
    getAssessmentById,
    getAssessmentsByInstitution,
    getAssessmentsByClinician
};
