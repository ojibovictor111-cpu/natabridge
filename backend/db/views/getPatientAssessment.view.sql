-- Non-authoritative reference. Runtime patient reads query mothers directly.
-- Any deployed view must be introduced by a numbered migration.
CREATE OR REPLACE VIEW get_patients_latest_assessment AS
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
) latest ON TRUE;
