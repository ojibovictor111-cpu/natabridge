-- Migration: Create care delivery schema
-- Created: 2026-09-01
-- Description: Introduces institutional care history, clinical visits, and specialized maternal and neonatal assessments.

CREATE TYPE institutional_care_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'ENDED',
    'TRANSFERRED'
);

CREATE TABLE institutional_care (
    id UUID PRIMARY KEY,
    institution_id UUID NOT NULL,
    beneficiary_id UUID NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    status institutional_care_status NOT NULL DEFAULT 'ACTIVE',
    reason TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
        ON DELETE RESTRICT,
    CONSTRAINT institutional_care_chronology_valid
        CHECK (ended_at IS NULL OR ended_at >= started_at),
    CONSTRAINT institutional_care_status_dates_valid
        CHECK (
            (status IN ('ACTIVE', 'SUSPENDED') AND ended_at IS NULL)
            OR
            (status IN ('ENDED', 'TRANSFERRED') AND ended_at IS NOT NULL)
        )
);

CREATE INDEX institutional_care_active_beneficiary_idx
    ON institutional_care (beneficiary_id)
    WHERE ended_at IS NULL;

CREATE INDEX institutional_care_beneficiary_status_idx
    ON institutional_care (beneficiary_id, status);

CREATE INDEX institutional_care_institution_status_idx
    ON institutional_care (institution_id, status);

CREATE INDEX institutional_care_creator_idx
    ON institutional_care (created_by);

CREATE TABLE clinical_visits (
    id UUID PRIMARY KEY,
    beneficiary_id UUID NOT NULL,
    pregnancy_id UUID,
    institution_id UUID NOT NULL,
    practitioner_id UUID NOT NULL,
    visit_type VARCHAR(50) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

CREATE INDEX clinical_visits_beneficiary_occurred_at_idx
    ON clinical_visits (beneficiary_id, occurred_at DESC);

CREATE INDEX clinical_visits_pregnancy_idx
    ON clinical_visits (pregnancy_id)
    WHERE pregnancy_id IS NOT NULL;

CREATE INDEX clinical_visits_institution_occurred_at_idx
    ON clinical_visits (institution_id, occurred_at DESC);

CREATE INDEX clinical_visits_practitioner_occurred_at_idx
    ON clinical_visits (practitioner_id, occurred_at DESC);

CREATE TABLE antenatal_assessments (
    id UUID PRIMARY KEY,
    visit_id UUID NOT NULL UNIQUE,
    gestational_age_weeks NUMERIC(5, 2),
    systolic_bp NUMERIC(6, 2),
    diastolic_bp NUMERIC(6, 2),
    weight NUMERIC(6, 2),
    fundal_height NUMERIC(6, 2),
    fetal_heart_rate NUMERIC(6, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT neonatal_assessments_visit_fk
        FOREIGN KEY (visit_id)
        REFERENCES clinical_visits(id)
        ON DELETE CASCADE
);
