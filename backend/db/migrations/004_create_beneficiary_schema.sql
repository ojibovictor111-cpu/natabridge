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
