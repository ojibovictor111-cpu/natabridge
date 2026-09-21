-- Non-authoritative reference. Runtime dashboard reads query mothers directly.
-- Any deployed view must be introduced by a numbered migration.
CREATE OR REPLACE VIEW get_dashboard_details AS
WITH latest_assessments AS (
    SELECT DISTINCT ON (assessment.beneficiary_id)
        assessment.id AS assessment_id,
        assessment.beneficiary_id AS patient_id,
        assessment.gestational_age,
        assessment.created_at,
        prediction_run.age,
        prediction_run.systolic_bp,
        prediction_run.diastolic_bp,
        prediction_run.blood_sugar,
        prediction_run.body_temperature_celsius,
        prediction_run.heart_rate,
        prediction_result.id AS prediction_result_id,
        prediction_result.prediction,
        prediction_result.confidence
    FROM assessments assessment
    INNER JOIN prediction_runs prediction_run
        ON prediction_run.id = assessment.prediction_run_id
        AND prediction_run.source = 'patient_assessment'
        AND prediction_run.status = 'completed'
    INNER JOIN prediction_results prediction_result
        ON prediction_result.prediction_run_id = prediction_run.id
    ORDER BY assessment.beneficiary_id, assessment.created_at DESC, assessment.id DESC
)
SELECT
    latest.assessment_id,
    latest.patient_id,
    CONCAT_WS(' ', mother.firstname, mother.middlename, mother.lastname) AS name,
    latest.age,
    latest.gestational_age,
    latest.prediction,
    latest.confidence,
    latest.created_at,
    latest.systolic_bp,
    latest.diastolic_bp,
    latest.blood_sugar,
    latest.body_temperature_celsius,
    latest.heart_rate,
    COALESCE(factors.items, '[]'::JSON) AS factors
FROM latest_assessments latest
INNER JOIN mothers mother ON mother.id = latest.patient_id
LEFT JOIN LATERAL (
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT('feature', factor.feature, 'impact', factor.impact)
        ORDER BY ABS(factor.impact) DESC
    ) AS items
    FROM prediction_factors factor
    WHERE factor.prediction_result_id = latest.prediction_result_id
) factors ON TRUE;
