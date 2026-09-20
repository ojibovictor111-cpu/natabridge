import type { PoolClient } from "pg";
import type { PatientRepoInput, PatientSummaryRow } from "../../models/patient/repo/patients.repo";
import { uuidv7 } from "uuidv7";

const patientSummaryQuery = `
    SELECT
        mother.id,
        CONCAT_WS(' ', mother.firstname, mother.middlename, mother.lastname) AS name,
        latest.age,
        latest.gestational_age AS "gestationalAge",
        latest.created_at AS "lastAssessment",
        latest.prediction AS "currentRiskLevel"
    FROM mothers mother
    LEFT JOIN LATERAL (
        SELECT
            prediction_run.age,
            assessment.gestational_age,
            assessment.created_at,
            prediction_result.prediction
        FROM assessments assessment
        INNER JOIN prediction_runs prediction_run
            ON prediction_run.id = assessment.prediction_run_id
            AND prediction_run.source = 'patient_assessment'
            AND prediction_run.status = 'completed'
        INNER JOIN prediction_results prediction_result
            ON prediction_result.prediction_run_id = prediction_run.id
        WHERE assessment.beneficiary_id = mother.id
        ORDER BY assessment.created_at DESC, assessment.id DESC
        LIMIT 1
    ) latest ON TRUE
`;

const createPatient = async (
    client: PoolClient,
    patient: PatientRepoInput,
    institutionId: string,
    createdByUserId: string
) => {
    await client.query(
        "INSERT INTO beneficiaries (id, type) VALUES ($1, 'MOTHER')",
        [patient.id]
    );

    const result = await client.query(
        `
        INSERT INTO mothers (
            id,
            firstname,
            middlename,
            lastname,
            date_of_birth,
            email,
            phone
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, firstname, middlename, lastname, email, phone, created_at
        `,
        [
            patient.id,
            patient.firstName,
            patient.middleName,
            patient.lastName,
            patient.dob,
            patient.email,
            patient.phone
        ]
    );

    await client.query(`
        INSERT INTO institutional_care (id, institution_id, beneficiary_id, created_by)
        VALUES ($1, $2, $3, $4)
    `, [`care-${uuidv7()}`, institutionId, patient.id, createdByUserId]);

    return result.rows[0];
};

const getPatientsWithLatestAssessment = async(
    client: PoolClient,
    institutionId: string
) => {
    const result = await client.query<PatientSummaryRow>(
        `${patientSummaryQuery} WHERE EXISTS (
            SELECT 1 FROM institutional_care care
            WHERE care.beneficiary_id = mother.id
              AND care.institution_id = $1
              AND care.status = 'ACTIVE'
              AND care.ended_at IS NULL
        ) ORDER BY mother.created_at DESC, mother.id DESC`,
        [institutionId]
    );

    return result.rows;
}

const getPatientById = async (
    client: PoolClient,
    patientId: string,
    institutionId: string
) => {
    const result = await client.query<PatientSummaryRow>(
        `${patientSummaryQuery} WHERE mother.id = $1 AND EXISTS (
            SELECT 1 FROM institutional_care care
            WHERE care.beneficiary_id = mother.id
              AND care.institution_id = $2
              AND care.status = 'ACTIVE'
              AND care.ended_at IS NULL
        )`,
        [patientId, institutionId]
    );

    return result.rows[0];
};

const patientExists = async (
    client: PoolClient,
    patientId: string,
    institutionId: string
) => {
    const result = await client.query(
        `SELECT EXISTS (
            SELECT 1 FROM mothers mother
            JOIN institutional_care care ON care.beneficiary_id = mother.id
            WHERE mother.id = $1 AND care.institution_id = $2
              AND care.status = 'ACTIVE' AND care.ended_at IS NULL
        ) AS exists`,
        [patientId, institutionId]
    );

    return result.rows[0]?.exists === true;
};

export {
    createPatient,
    getPatientById,
    getPatientsWithLatestAssessment,
    patientExists
}
