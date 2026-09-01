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
