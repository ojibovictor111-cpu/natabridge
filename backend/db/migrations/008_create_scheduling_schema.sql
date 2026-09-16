-- Migration: Create scheduling schema
-- Created: 2026-09-01
-- Description: Introduces appointment types and scheduled beneficiary care for NataBridge.

CREATE TYPE appointment_status AS ENUM (
    'SCHEDULED',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'MISSED'
);

CREATE TABLE appointment_types (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE appointments (
    id VARCHAR(100) PRIMARY KEY,
    beneficiary_id VARCHAR(100) NOT NULL,
    institution_id VARCHAR(100) NOT NULL,
    practitioner_id VARCHAR(100),
    pregnancy_id VARCHAR(100),
    appointment_type_id VARCHAR(100) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status appointment_status NOT NULL DEFAULT 'SCHEDULED',
    notes TEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

CREATE INDEX appointments_beneficiary_scheduled_at_idx
    ON appointments (beneficiary_id, scheduled_at DESC);

CREATE INDEX appointments_institution_status_scheduled_at_idx
    ON appointments (institution_id, status, scheduled_at);

CREATE INDEX appointments_practitioner_scheduled_at_idx
    ON appointments (practitioner_id, scheduled_at)
    WHERE practitioner_id IS NOT NULL;

CREATE INDEX appointments_pregnancy_idx
    ON appointments (pregnancy_id)
    WHERE pregnancy_id IS NOT NULL;

CREATE INDEX appointments_type_idx
    ON appointments (appointment_type_id);

CREATE INDEX appointments_creator_idx
    ON appointments (created_by);

CREATE TRIGGER appointments_set_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
