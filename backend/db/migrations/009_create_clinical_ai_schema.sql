-- Migration: Create clinical and AI schema
-- Created: 2026-09-01
-- Description: Introduces prediction runs, clinical assessments, structured AI results, and explainability factors.

CREATE TYPE prediction_run_source AS ENUM (
    'standalone',
    'patient_assessment'
);

CREATE TYPE prediction_run_status AS ENUM (
    'pending',
    'completed',
    'failed'
);

-- Tracks every request sent to the prediction service, including failed and standalone attempts that are not associated with a beneficiary assessment.
CREATE TABLE prediction_runs (
    id UUID PRIMARY KEY,
    source prediction_run_source NOT NULL,
    status prediction_run_status NOT NULL DEFAULT 'pending',
    created_by_user_id UUID,
    request_id VARCHAR(100) NOT NULL,

    age NUMERIC(5, 2) NOT NULL,
    systolic_bp NUMERIC(6, 2) NOT NULL,
    diastolic_bp NUMERIC(6, 2) NOT NULL,
    blood_sugar NUMERIC(6, 2) NOT NULL,
    body_temperature_celsius NUMERIC(5, 2) NOT NULL,
    heart_rate NUMERIC(6, 2) NOT NULL,

    failure_code VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,

    CONSTRAINT prediction_runs_request_id_unique
        UNIQUE (request_id),
    CONSTRAINT prediction_runs_source_user_valid
        CHECK (
            (source = 'standalone' AND created_by_user_id IS NULL)
            OR
            (source = 'patient_assessment' AND created_by_user_id IS NOT NULL)
        ),
    CONSTRAINT prediction_runs_age_valid
        CHECK (age BETWEEN 10 AND 70),
    CONSTRAINT prediction_runs_systolic_bp_valid
        CHECK (systolic_bp BETWEEN 60 AND 250),
    CONSTRAINT prediction_runs_diastolic_bp_valid
        CHECK (diastolic_bp BETWEEN 30 AND 150),
    CONSTRAINT prediction_runs_blood_sugar_valid
        CHECK (blood_sugar >= 2),
    CONSTRAINT prediction_runs_body_temperature_valid
        CHECK (body_temperature_celsius BETWEEN 36 AND 43),
    CONSTRAINT prediction_runs_heart_rate_valid
        CHECK (heart_rate BETWEEN 30 AND 220),
    CONSTRAINT prediction_runs_lifecycle_valid
        CHECK (
            (
                status = 'pending'
                AND completed_at IS NULL
                AND failed_at IS NULL
                AND failure_code IS NULL
            )
            OR
            (
                status = 'completed'
                AND completed_at IS NOT NULL
                AND failed_at IS NULL
                AND failure_code IS NULL
            )
            OR
            (
                status = 'failed'
                AND completed_at IS NULL
                AND failed_at IS NOT NULL
                AND failure_code IS NOT NULL
            )
        ),
    CONSTRAINT prediction_runs_creator_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
);

-- Stores the clinical context for a beneficiary assessment. The model inputs and execution lifecycle remain on the associated prediction run.
CREATE TABLE assessments (
    id UUID PRIMARY KEY,
    beneficiary_id UUID NOT NULL,
    pregnancy_id UUID,
    clinical_visit_id UUID,
    prediction_run_id UUID NOT NULL UNIQUE,
    created_by_user_id UUID NOT NULL,

    gestational_age NUMERIC(5, 2),
    first_pregnancy BOOLEAN,
    previous_complications TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT assessments_gestational_age_valid
        CHECK (gestational_age IS NULL OR gestational_age BETWEEN 1 AND 45),
    CONSTRAINT assessments_beneficiary_fk
        FOREIGN KEY (beneficiary_id)
        REFERENCES beneficiaries(id)
        ON DELETE RESTRICT,
    CONSTRAINT assessments_pregnancy_fk
        FOREIGN KEY (pregnancy_id)
        REFERENCES pregnancies(id)
        ON DELETE RESTRICT,
    CONSTRAINT assessments_clinical_visit_fk
        FOREIGN KEY (clinical_visit_id)
        REFERENCES clinical_visits(id)
        ON DELETE RESTRICT,
    CONSTRAINT assessments_prediction_run_fk
        FOREIGN KEY (prediction_run_id)
        REFERENCES prediction_runs(id)
        ON DELETE RESTRICT,
    CONSTRAINT assessments_creator_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
);

-- Stores the single structured model output produced by a successful run.
CREATE TABLE prediction_results (
    id UUID PRIMARY KEY,
    prediction_run_id UUID NOT NULL UNIQUE,
    prediction VARCHAR(30) NOT NULL,
    confidence NUMERIC(6, 5) NOT NULL,
    low_risk_probability NUMERIC(6, 5) NOT NULL,
    mid_risk_probability NUMERIC(6, 5) NOT NULL,
    high_risk_probability NUMERIC(6, 5) NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    response_payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT prediction_results_risk_valid
        CHECK (prediction IN ('Low Risk', 'Mid Risk', 'High Risk')),
    CONSTRAINT prediction_results_confidence_valid
        CHECK (confidence BETWEEN 0 AND 1),
    CONSTRAINT prediction_results_low_probability_valid
        CHECK (low_risk_probability BETWEEN 0 AND 1),
    CONSTRAINT prediction_results_mid_probability_valid
        CHECK (mid_risk_probability BETWEEN 0 AND 1),
    CONSTRAINT prediction_results_high_probability_valid
        CHECK (high_risk_probability BETWEEN 0 AND 1),
    CONSTRAINT prediction_results_probabilities_sum_valid
        CHECK (
            ABS(
                low_risk_probability
                + mid_risk_probability
                + high_risk_probability
                - 1
            ) <= 0.001
        ),
    CONSTRAINT prediction_results_payload_is_object
        CHECK (JSONB_TYPEOF(response_payload) = 'object'),
    CONSTRAINT prediction_results_run_fk
        FOREIGN KEY (prediction_run_id)
        REFERENCES prediction_runs(id)
        ON DELETE CASCADE
);

-- Stores queryable explainability factors separately from the complete JSONB response retained on prediction_results.
CREATE TABLE prediction_factors (
    id UUID PRIMARY KEY,
    prediction_result_id UUID NOT NULL,
    feature VARCHAR(100) NOT NULL,
    impact NUMERIC(10, 5) NOT NULL,

    CONSTRAINT prediction_factors_feature_not_blank
        CHECK (BTRIM(feature) <> ''),
    CONSTRAINT prediction_factors_result_feature_unique
        UNIQUE (prediction_result_id, feature),
    CONSTRAINT prediction_factors_result_fk
        FOREIGN KEY (prediction_result_id)
        REFERENCES prediction_results(id)
        ON DELETE CASCADE
);
