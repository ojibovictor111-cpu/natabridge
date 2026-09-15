-- Migration: Create practitioners schema
-- Created: 2026-09-01
-- Description: Introduces practitioner profiles, professional designations, onboarding, and institution memberships.

CREATE TYPE membership_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'ENDED'
);

CREATE TABLE practitioner_designations (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER practitioner_designations_set_updated_at
    BEFORE UPDATE ON practitioner_designations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE practitioners (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    designation_id UUID NOT NULL,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    professional_registration_number VARCHAR(100) NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT practitioners_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT practitioners_designation_fk
        FOREIGN KEY (designation_id)
        REFERENCES practitioner_designations(id)
        ON DELETE RESTRICT
);

CREATE INDEX practitioners_designation_idx
    ON practitioners (designation_id);

CREATE TRIGGER practitioners_set_updated_at
    BEFORE UPDATE ON practitioners
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE practitioner_onboarding (
    id UUID PRIMARY KEY,
    practitioner_id UUID NOT NULL,
    submitted_by UUID NOT NULL,
    reviewed_by UUID,
    status onboarding_status NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ,
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
        ON DELETE SET NULL,
    CONSTRAINT practitioner_onboarding_review_chronology_valid
        CHECK (reviewed_at IS NULL OR reviewed_at >= submitted_at)
);

CREATE INDEX practitioner_onboarding_practitioner_idx
    ON practitioner_onboarding (practitioner_id, submitted_at DESC);

CREATE INDEX practitioner_onboarding_submitter_idx
    ON practitioner_onboarding (submitted_by);

CREATE INDEX practitioner_onboarding_reviewer_idx
    ON practitioner_onboarding (reviewed_by)
    WHERE reviewed_by IS NOT NULL;

CREATE TABLE institution_memberships (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    institution_id UUID NOT NULL,
    status membership_status NOT NULL DEFAULT 'ACTIVE',
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT institution_memberships_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT institution_memberships_institution_fk
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON DELETE CASCADE,
    CONSTRAINT institution_memberships_chronology_valid
        CHECK (ended_at IS NULL OR ended_at >= started_at),
    CONSTRAINT institution_memberships_status_dates_valid
        CHECK (
            (status IN ('ACTIVE', 'SUSPENDED') AND ended_at IS NULL)
            OR
            (status = 'ENDED' AND ended_at IS NOT NULL)
        )
);

CREATE UNIQUE INDEX institution_memberships_active_user_institution_unique
    ON institution_memberships (user_id, institution_id)
    WHERE status = 'ACTIVE' AND ended_at IS NULL;

CREATE INDEX institution_memberships_institution_idx
    ON institution_memberships (institution_id, status);

CREATE INDEX institution_memberships_user_idx
    ON institution_memberships (user_id);
