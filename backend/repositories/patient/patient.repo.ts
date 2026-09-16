import type { PoolClient } from "pg";
import type { PatientRepoInput } from "../../models/patient/repo/patients.repo";

type PatientSummaryRow = {
    id: string;
    name: string;
    age: string | number | null;
    gestationalAge: string | number | null;
    lastAssessment: string | Date | null;
    currentRiskLevel: string | null;
};

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
    patient: PatientRepoInput
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

    return result.rows[0];
};

const getPatientsWithLatestAssessment = async(
    client: PoolClient,
) => {
    const result = await client.query<PatientSummaryRow>(
        `${patientSummaryQuery} ORDER BY mother.created_at DESC, mother.id DESC`
    );

    return result.rows;
}

const getPatientById = async (
    client: PoolClient,
    patientId: string
) => {
    const result = await client.query<PatientSummaryRow>(
        `${patientSummaryQuery} WHERE mother.id = $1`,
        [patientId]
    );

    return result.rows[0];
};

const patientExists = async (
    client: PoolClient,
    patientId: string
) => {
    const result = await client.query(
        "SELECT EXISTS (SELECT 1 FROM mothers WHERE id = $1) AS exists",
        [patientId]
    );

    return result.rows[0]?.exists === true;
};

export {
    createPatient,
    getPatientById,
    getPatientsWithLatestAssessment,
    patientExists
}

export type {
    PatientSummaryRow
};
