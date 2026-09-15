-- NataBridge consolidated database schema reference
-- Last synchronized: 2026-09-15
-- This file is a view model for documentation and review only.
-- Do not execute this file or treat it as migration history.
-- The ordered files in db/migrations are the authoritative schema source.


-- Source: db/migrations/001_create_identity_schema.sql

-- Migration: Create identity and RBAC schema
-- Created: 2026-09-01
-- Description: Introduces roles, permissions, and their assignments for NataBridge access control.

CREATE TYPE role_scope AS ENUM (
    'PLATFORM',
    'INSTITUTION',
    'CLINICAL'
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    contact VARCHAR(30),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    scope role_scope NOT NULL,
    description TEXT,

    CONSTRAINT roles_name_scope_unique
        UNIQUE (name, scope),
    CONSTRAINT roles_id_scope_unique
        UNIQUE (id, scope)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    scope role_scope NOT NULL,
    description TEXT,

    CONSTRAINT permissions_name_scope_unique
        UNIQUE (name, scope),
    CONSTRAINT permissions_id_scope_unique
        UNIQUE (id, scope)
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    scope role_scope NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT role_permissions_role_scope_fk
        FOREIGN KEY (role_id, scope)
        REFERENCES roles(id, scope)
        ON DELETE CASCADE,
    CONSTRAINT role_permissions_permission_scope_fk
        FOREIGN KEY (permission_id, scope)
        REFERENCES permissions(id, scope)
        ON DELETE CASCADE
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,

    PRIMARY KEY (user_id, role_id),

    CONSTRAINT user_roles_role_fk
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE CASCADE,
    CONSTRAINT user_roles_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Source: db/migrations/002_create_institution_schema.sql

-- Migration: Create institutions schema
-- Created: 2026-09-01
-- Description: Introduces healthcare institutions and their onboarding review workflow for NataBridge.

CREATE TABLE institutions (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    registration_number VARCHAR(100) UNIQUE,
    phone VARCHAR(30),
    email VARCHAR(255),
    address TEXT NOT NULL,
    region VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE institution_onboarding (
    id UUID PRIMARY KEY,
    institution_id UUID NOT NULL,
    submitted_by UUID NOT NULL,
    reviewed_by UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,

    CONSTRAINT institution_onboarding_institution_fk
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON DELETE CASCADE,
    CONSTRAINT institution_onboarding_submitter_fk
        FOREIGN KEY (submitted_by)
        REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT institution_onboarding_reviewer_fk
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

-- Source: db/migrations/003_create_practitioner_schema.sql

-- Migration: Create practitioners schema
-- Created: 2026-09-01
-- Description: Introduces practitioner profiles, professional designations, onboarding, and institution memberships.

CREATE TABLE practitioner_designations (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE practitioners (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    designation_id UUID NOT NULL,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    professional_registration_number VARCHAR(100) NOT NULL UNIQUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT practitioners_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT practitioners_designation_fk
        FOREIGN KEY (designation_id)
        REFERENCES practitioner_designations(id)
        ON DELETE RESTRICT
);

CREATE TABLE practitioner_onboarding (
    id UUID PRIMARY KEY,
    practitioner_id UUID NOT NULL,
    submitted_by UUID NOT NULL,
    reviewed_by UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,

    CONSTRAINT practitioner_onboarding_practitioner_fk
        FOREIGN KEY (practitioner_id)
        REFERENCES practitioners(id)
        ON DELETE CASCADE,
    CONSTRAINT practitioner_onboarding_submitter_fk
        FOREIGN KEY (submitted_by)
        REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT practitioner_onboarding_reviewer_fk
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE institution_memberships (
    id UUID PRIMARY KEY,
    practitioner_id UUID NOT NULL,
    institution_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT institution_memberships_practitioner_institution_unique
        UNIQUE (practitioner_id, institution_id),
    CONSTRAINT institution_memberships_practitioner_fk
        FOREIGN KEY (practitioner_id)
        REFERENCES practitioners(id)
        ON DELETE CASCADE,
    CONSTRAINT institution_memberships_institution_fk
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON DELETE CASCADE
);

-- Source: db/migrations/004_create_beneficiary_schema.sql

-- Migration: Create beneficiaries schema
-- Created: 2026-09-01
-- Description: Introduces beneficiary records and their mother or baby classifications for NataBridge.

CREATE TYPE beneficiary_type AS ENUM (
    'MOTHER',
    'BABY'
);

CREATE TABLE beneficiaries (
    id UUID PRIMARY KEY,
    type beneficiary_type NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mothers (
    id UUID PRIMARY KEY,
    firstname VARCHAR(100) NOT NULL,
    middlename VARCHAR(100),
    lastname VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT mothers_beneficiary_fk
        FOREIGN KEY (id)
        REFERENCES beneficiaries(id)
        ON DELETE CASCADE,
    CONSTRAINT mothers_firstname_not_blank
        CHECK (BTRIM(firstname) <> ''),
    CONSTRAINT mothers_lastname_not_blank
        CHECK (BTRIM(lastname) <> ''),
    CONSTRAINT mothers_contact_required
        CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE babies (
    id UUID PRIMARY KEY,
    pregnancy_id UUID NOT NULL,
    birth_date DATE NOT NULL,
    birth_time TIME,
    birth_weight NUMERIC(6, 3),
    sex VARCHAR(20),
    birth_status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT babies_beneficiary_fk
        FOREIGN KEY (id)
        REFERENCES beneficiaries(id)
        ON DELETE CASCADE
);

-- Source: db/migrations/005_create_maternal_care_schema.sql

-- Migration: Create maternal care schema
-- Created: 2026-09-01
-- Description: Introduces pregnancies, maternal complications, and pregnancy complication records for NataBridge.

CREATE TABLE pregnancies (
    id UUID PRIMARY KEY,
    mother_id UUID NOT NULL,
    notice_date DATE NOT NULL,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    status VARCHAR(30) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pregnancies_mother_fk
        FOREIGN KEY (mother_id)
        REFERENCES mothers(id)
        ON DELETE RESTRICT
);

CREATE TABLE complications (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT
);

CREATE TABLE pregnancy_complications (
    id UUID PRIMARY KEY,
    pregnancy_id UUID NOT NULL,
    complication_id UUID NOT NULL,
    diagnosed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(30),
    notes TEXT,
    resolved_at TIMESTAMP,
    recorded_by UUID NOT NULL,

    CONSTRAINT pregnancy_complications_pregnancy_fk
        FOREIGN KEY (pregnancy_id)
        REFERENCES pregnancies(id)
        ON DELETE CASCADE,
    CONSTRAINT pregnancy_complications_complication_fk
        FOREIGN KEY (complication_id)
        REFERENCES complications(id)
        ON DELETE RESTRICT,
    CONSTRAINT pregnancy_complications_recorder_fk
        FOREIGN KEY (recorded_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
);

ALTER TABLE babies
    ADD CONSTRAINT babies_pregnancy_fk
    FOREIGN KEY (pregnancy_id)
    REFERENCES pregnancies(id)
    ON DELETE RESTRICT;

-- Source: db/migrations/006_create_care_delivery_schema.sql

-- Migration: Create care delivery schema
-- Created: 2026-09-01
-- Description: Introduces institutional care history, clinical visits, and specialized maternal and neonatal assessments.

CREATE TABLE institutional_care (
    id UUID PRIMARY KEY,
    institution_id UUID NOT NULL,
    beneficiary_id UUID NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    reason TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT institutional_care_institution_fk
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON DELETE RESTRICT,
    CONSTRAINT institutional_care_beneficiary_fk
        FOREIGN KEY (beneficiary_id)
        REFERENCES beneficiaries(id)
        ON DELETE RESTRICT,
    CONSTRAINT institutional_care_creator_fk
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
);

CREATE INDEX institutional_care_active_beneficiary_idx
    ON institutional_care (beneficiary_id)
    WHERE ended_at IS NULL;

CREATE TABLE clinical_visits (
    id UUID PRIMARY KEY,
    beneficiary_id UUID NOT NULL,
    pregnancy_id UUID,
    institution_id UUID NOT NULL,
    practitioner_id UUID NOT NULL,
    visit_type VARCHAR(50) NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT clinical_visits_beneficiary_fk
        FOREIGN KEY (beneficiary_id)
        REFERENCES beneficiaries(id)
        ON DELETE RESTRICT,
    CONSTRAINT clinical_visits_pregnancy_fk
        FOREIGN KEY (pregnancy_id)
        REFERENCES pregnancies(id)
        ON DELETE RESTRICT,
    CONSTRAINT clinical_visits_institution_fk
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON DELETE RESTRICT,
    CONSTRAINT clinical_visits_practitioner_fk
        FOREIGN KEY (practitioner_id)
        REFERENCES practitioners(id)
        ON DELETE RESTRICT
);

CREATE TABLE antenatal_assessments (
    id UUID PRIMARY KEY,
    visit_id UUID NOT NULL UNIQUE,
    gestational_age_weeks NUMERIC(5, 2),
    systolic_bp NUMERIC(6, 2),
    diastolic_bp NUMERIC(6, 2),
    weight NUMERIC(6, 2),
    fundal_height NUMERIC(6, 2),
    fetal_heart_rate NUMERIC(6, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT antenatal_assessments_visit_fk
        FOREIGN KEY (visit_id)
        REFERENCES clinical_visits(id)
        ON DELETE CASCADE
);

CREATE TABLE postnatal_assessments (
    id UUID PRIMARY KEY,
    visit_id UUID NOT NULL UNIQUE,
    systolic_bp NUMERIC(6, 2),
    diastolic_bp NUMERIC(6, 2),
    body_temperature_celsius NUMERIC(5, 2),
    weight NUMERIC(6, 2),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT postnatal_assessments_visit_fk
        FOREIGN KEY (visit_id)
        REFERENCES clinical_visits(id)
        ON DELETE CASCADE
);

CREATE TABLE neonatal_assessments (
    id UUID PRIMARY KEY,
    visit_id UUID NOT NULL UNIQUE,
    weight NUMERIC(6, 3),
    body_temperature_celsius NUMERIC(5, 2),
    heart_rate NUMERIC(6, 2),
    respiratory_rate NUMERIC(6, 2),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT neonatal_assessments_visit_fk
        FOREIGN KEY (visit_id)
        REFERENCES clinical_visits(id)
        ON DELETE CASCADE
);

-- Source: db/migrations/007_create_referral_schema.sql

-- Migration: Create referrals schema
-- Created: 2026-09-01
-- Description: Introduces beneficiary referrals between healthcare institutions and tracks their lifecycle.

CREATE TYPE referral_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'DECLINED',
    'IN_TRANSIT',
    'ARRIVED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TABLE referrals (
    id UUID PRIMARY KEY,
    beneficiary_id UUID NOT NULL,
    pregnancy_id UUID,
    from_institution_id UUID NOT NULL,
    to_institution_id UUID NOT NULL,
    referred_by UUID NOT NULL,
    reason TEXT NOT NULL,
    priority VARCHAR(30) NOT NULL,
    status referral_status NOT NULL DEFAULT 'PENDING',
    referred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,

    CONSTRAINT referrals_beneficiary_fk
        FOREIGN KEY (beneficiary_id)
        REFERENCES beneficiaries(id)
        ON DELETE RESTRICT,
    CONSTRAINT referrals_pregnancy_fk
        FOREIGN KEY (pregnancy_id)
        REFERENCES pregnancies(id)
        ON DELETE RESTRICT,
    CONSTRAINT referrals_from_institution_fk
        FOREIGN KEY (from_institution_id)
        REFERENCES institutions(id)
        ON DELETE RESTRICT,
    CONSTRAINT referrals_to_institution_fk
        FOREIGN KEY (to_institution_id)
        REFERENCES institutions(id)
        ON DELETE RESTRICT,
    CONSTRAINT referrals_referrer_fk
        FOREIGN KEY (referred_by)
        REFERENCES practitioners(id)
        ON DELETE RESTRICT
);

-- Source: db/migrations/008_create_scheduling_schema.sql

-- Migration: Create scheduling schema
-- Created: 2026-09-01
-- Description: Introduces appointment types and scheduled beneficiary care for NataBridge.

CREATE TABLE appointment_types (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE appointments (
    id UUID PRIMARY KEY,
    beneficiary_id UUID NOT NULL,
    institution_id UUID NOT NULL,
    practitioner_id UUID,
    pregnancy_id UUID,
    appointment_type_id UUID NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT appointments_beneficiary_fk
        FOREIGN KEY (beneficiary_id)
        REFERENCES beneficiaries(id)
        ON DELETE RESTRICT,
    CONSTRAINT appointments_institution_fk
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON DELETE RESTRICT,
    CONSTRAINT appointments_practitioner_fk
        FOREIGN KEY (practitioner_id)
        REFERENCES practitioners(id)
        ON DELETE SET NULL,
    CONSTRAINT appointments_pregnancy_fk
        FOREIGN KEY (pregnancy_id)
        REFERENCES pregnancies(id)
        ON DELETE RESTRICT,
    CONSTRAINT appointments_type_fk
        FOREIGN KEY (appointment_type_id)
        REFERENCES appointment_types(id)
        ON DELETE RESTRICT,
    CONSTRAINT appointments_creator_fk
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
);

-- Source: db/migrations/009_create_clinical_ai_schema.sql

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

-- Source: db/migrations/010_create_system_schema.sql

-- Migration: Create system schema
-- Created: 2026-09-01
-- Description: Introduces immutable audit records for changes made across NataBridge.

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    actor_user_id UUID,
    institution_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT audit_logs_actor_fk
        FOREIGN KEY (actor_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT audit_logs_institution_fk
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON DELETE SET NULL,
    CONSTRAINT audit_logs_old_values_is_object
        CHECK (old_values IS NULL OR JSONB_TYPEOF(old_values) = 'object'),
    CONSTRAINT audit_logs_new_values_is_object
        CHECK (new_values IS NULL OR JSONB_TYPEOF(new_values) = 'object')
);

CREATE INDEX audit_logs_entity_idx
    ON audit_logs (entity_type, entity_id);

CREATE INDEX audit_logs_actor_created_at_idx
    ON audit_logs (actor_user_id, created_at DESC);

