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
