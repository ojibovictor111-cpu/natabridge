-- Migration: Create maternal care schema
-- Created: 2026-09-01
-- Description: Introduces pregnancies, maternal complications, and pregnancy complication records for NataBridge.

CREATE TYPE pregnancy_status AS ENUM (
    'ONGOING',
    'COMPLETED',
    'TERMINATED'
);

CREATE TABLE pregnancies (
    id VARCHAR(100) PRIMARY KEY,
    mother_id VARCHAR(100) NOT NULL,
    notice_date DATE NOT NULL,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    status pregnancy_status NOT NULL DEFAULT 'ONGOING',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pregnancies_mother_fk
        FOREIGN KEY (mother_id)
        REFERENCES mothers(id)
        ON DELETE RESTRICT,
    CONSTRAINT pregnancies_status_dates_valid
        CHECK (
            (status = 'ONGOING' AND actual_delivery_date IS NULL)
            OR
            (status = 'COMPLETED' AND actual_delivery_date IS NOT NULL)
            OR
            status = 'TERMINATED'
        )
);

CREATE INDEX pregnancies_mother_status_idx
    ON pregnancies (mother_id, status);

CREATE TRIGGER pregnancies_set_updated_at
    BEFORE UPDATE ON pregnancies
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE complications (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT
);

CREATE TABLE pregnancy_complications (
    id VARCHAR(100) PRIMARY KEY,
    pregnancy_id VARCHAR(100) NOT NULL,
    complication_id VARCHAR(100) NOT NULL,
    diagnosed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(30),
    notes TEXT,
    resolved_at TIMESTAMPTZ,
    recorded_by VARCHAR(100) NOT NULL,

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
        ON DELETE RESTRICT,
    CONSTRAINT pregnancy_complications_resolution_chronology_valid
        CHECK (resolved_at IS NULL OR resolved_at >= diagnosed_at)
);

CREATE INDEX pregnancy_complications_pregnancy_idx
    ON pregnancy_complications (pregnancy_id, diagnosed_at DESC);

CREATE INDEX pregnancy_complications_complication_idx
    ON pregnancy_complications (complication_id);

CREATE INDEX pregnancy_complications_recorder_idx
    ON pregnancy_complications (recorded_by);

ALTER TABLE babies
    ADD CONSTRAINT babies_pregnancy_fk
    FOREIGN KEY (pregnancy_id)
    REFERENCES pregnancies(id)
    ON DELETE RESTRICT;

CREATE INDEX babies_pregnancy_idx
    ON babies (pregnancy_id);
