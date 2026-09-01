-- Real patient records only. Standalone prediction runs do not create patients.
CREATE TABLE patients (
    id VARCHAR(50) PRIMARY KEY,

    firstname VARCHAR(100) NOT NULL,
    middlename VARCHAR(100),
    lastname VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,

    email VARCHAR(255),
    phone VARCHAR(30),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT patient_firstname_not_blank
        CHECK (BTRIM(firstname) <> ''),
    CONSTRAINT patient_lastname_not_blank
        CHECK (BTRIM(lastname) <> ''),
    CONSTRAINT patient_contact_required
        CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- One row is created for every prediction attempt, including standalone runs. Model inputs live here because a prediction run does not require a patient.
CREATE TABLE prediction_runs (
    id VARCHAR(50) PRIMARY KEY,

    source VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_by_user_id VARCHAR(50),
    request_id VARCHAR(100) NOT NULL,

    age NUMERIC(5, 2) NOT NULL,
    systolic_bp NUMERIC(6, 2) NOT NULL,
    diastolic_bp NUMERIC(6, 2) NOT NULL,
    blood_sugar NUMERIC(6, 2) NOT NULL,
    body_temperature_celsius NUMERIC(5, 2) NOT NULL,
    heart_rate NUMERIC(6, 2) NOT NULL,

    failure_code VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,

    CONSTRAINT prediction_run_source_valid
        CHECK (source IN ('standalone', 'patient_assessment')),
    CONSTRAINT prediction_run_source_user_valid
        CHECK (
            (source = 'standalone' AND created_by_user_id IS NULL)
            OR
            (source = 'patient_assessment' AND created_by_user_id IS NOT NULL)
        ),
    CONSTRAINT prediction_run_status_valid
        CHECK (status IN ('pending', 'completed', 'failed')),
    CONSTRAINT prediction_run_age_valid
        CHECK (age BETWEEN 10 AND 70),
    CONSTRAINT prediction_run_systolic_bp_valid
        CHECK (systolic_bp BETWEEN 60 AND 250),
    CONSTRAINT prediction_run_diastolic_bp_valid
        CHECK (diastolic_bp BETWEEN 30 AND 150),
    CONSTRAINT prediction_run_blood_sugar_valid
        CHECK (blood_sugar >= 2),
    CONSTRAINT prediction_run_body_temperature_valid
        CHECK (body_temperature_celsius BETWEEN 36 AND 43),
    CONSTRAINT prediction_run_heart_rate_valid
        CHECK (heart_rate BETWEEN 30 AND 220),
    CONSTRAINT prediction_run_lifecycle_valid
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
        )
);

-- A patient assessment is clinical context attached to one completed prediction run. It can never exist without both a real patient and a prediction run.
CREATE TABLE assessments (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    prediction_run_id VARCHAR(50) NOT NULL UNIQUE,
    created_by_user_id VARCHAR(50) NOT NULL,

    gestational_age NUMERIC(5, 2),
    first_pregnancy BOOLEAN,
    previous_complications TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT assessment_gestational_age_valid
        CHECK (gestational_age IS NULL OR gestational_age BETWEEN 1 AND 45),
    CONSTRAINT fk_assessment_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_assessment_prediction_run
        FOREIGN KEY (prediction_run_id)
        REFERENCES prediction_runs(id)
        ON DELETE RESTRICT
);

-- A completed prediction run has one structured result. response_payload keeps the complete AI response, including recommendations and any future fields.
CREATE TABLE prediction_results (
    id VARCHAR(50) PRIMARY KEY,
    prediction_run_id VARCHAR(50) NOT NULL UNIQUE,

    prediction VARCHAR(30) NOT NULL,
    confidence NUMERIC(6, 5) NOT NULL,

    low_risk_probability NUMERIC(6, 5) NOT NULL,
    mid_risk_probability NUMERIC(6, 5) NOT NULL,
    high_risk_probability NUMERIC(6, 5) NOT NULL,

    model_version VARCHAR(100) NOT NULL,
    response_payload JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT prediction_result_risk_valid
        CHECK (prediction IN ('Low Risk', 'Mid Risk', 'High Risk')),
    CONSTRAINT prediction_result_confidence_valid
        CHECK (confidence BETWEEN 0 AND 1),
    CONSTRAINT prediction_result_low_probability_valid
        CHECK (low_risk_probability BETWEEN 0 AND 1),
    CONSTRAINT prediction_result_mid_probability_valid
        CHECK (mid_risk_probability BETWEEN 0 AND 1),
    CONSTRAINT prediction_result_high_probability_valid
        CHECK (high_risk_probability BETWEEN 0 AND 1),
    CONSTRAINT prediction_result_probabilities_sum_valid
        CHECK (
            ABS(
                low_risk_probability
                + mid_risk_probability
                + high_risk_probability
                - 1
            ) <= 0.001
        ),
    CONSTRAINT prediction_result_payload_is_object
        CHECK (JSONB_TYPEOF(response_payload) = 'object'),
    CONSTRAINT fk_prediction_result_run
        FOREIGN KEY (prediction_run_id)
        REFERENCES prediction_runs(id)
        ON DELETE CASCADE
);

CREATE TABLE prediction_factors (
    id VARCHAR(50) PRIMARY KEY,
    prediction_result_id VARCHAR(50) NOT NULL,

    feature VARCHAR(100) NOT NULL,
    impact NUMERIC(10, 5) NOT NULL,

    CONSTRAINT prediction_factor_feature_not_blank
        CHECK (BTRIM(feature) <> ''),
    CONSTRAINT prediction_factor_result_feature_unique
        UNIQUE (prediction_result_id, feature),
    CONSTRAINT fk_factor_prediction
        FOREIGN KEY (prediction_result_id)
        REFERENCES prediction_results(id)
        ON DELETE CASCADE
);
