-- Migration: Create institutions schema
-- Created: 2026-09-01
-- Description: Introduces healthcare institutions and their onboarding review workflow for NataBridge.

CREATE TYPE institution_status AS ENUM (
    'PENDING',
    'ACTIVE',
    'SUSPENDED',
    'REJECTED'
);

CREATE TYPE onboarding_status AS ENUM (
    'PENDING',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED'
);

CREATE TABLE institutions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    registration_number VARCHAR(100) UNIQUE,
    phone VARCHAR(30),
    email VARCHAR(255),
    address TEXT NOT NULL,
    region VARCHAR(100) NOT NULL,
    status institution_status NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER institutions_set_updated_at
    BEFORE UPDATE ON institutions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE institution_onboarding (
    id VARCHAR(100) PRIMARY KEY,
    institution_id VARCHAR(100) NOT NULL,
    submitted_by VARCHAR(100) NOT NULL,
    reviewed_by VARCHAR(100),
    status onboarding_status NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ,
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
        ON DELETE SET NULL,
    CONSTRAINT institution_onboarding_review_chronology_valid
        CHECK (reviewed_at IS NULL OR reviewed_at >= submitted_at)
);

CREATE INDEX institution_onboarding_institution_idx
    ON institution_onboarding (institution_id, submitted_at DESC);

CREATE INDEX institution_onboarding_submitter_idx
    ON institution_onboarding (submitted_by);

CREATE INDEX institution_onboarding_reviewer_idx
    ON institution_onboarding (reviewed_by)
    WHERE reviewed_by IS NOT NULL;

ALTER TABLE user_roles
    ADD CONSTRAINT user_roles_institution_fk
    FOREIGN KEY (institution_id)
    REFERENCES institutions(id)
    ON DELETE CASCADE;
