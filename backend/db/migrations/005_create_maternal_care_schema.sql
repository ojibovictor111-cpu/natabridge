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
