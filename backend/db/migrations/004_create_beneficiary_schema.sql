-- Migration: Create beneficiaries schema
-- Created: 2026-09-01
-- Description: Introduces beneficiary records and their mother or baby classifications for NataBridge.

CREATE TYPE beneficiary_type AS ENUM (
    'MOTHER',
    'BABY'
);

CREATE TYPE birth_status AS ENUM (
    'LIVE_BIRTH',
    'STILLBIRTH'
);

CREATE TABLE beneficiaries (
    id VARCHAR(100) PRIMARY KEY,
    type beneficiary_type NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT beneficiaries_id_type_unique
        UNIQUE (id, type)
);

CREATE TRIGGER beneficiaries_set_updated_at
    BEFORE UPDATE ON beneficiaries
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE INDEX beneficiaries_type_idx
    ON beneficiaries (type);

CREATE TABLE mothers (
    id VARCHAR(100) PRIMARY KEY,
    type beneficiary_type NOT NULL DEFAULT 'MOTHER',
    firstname VARCHAR(100) NOT NULL,
    middlename VARCHAR(100),
    lastname VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT mothers_beneficiary_fk
        FOREIGN KEY (id, type)
        REFERENCES beneficiaries(id, type)
        ON DELETE CASCADE,
    CONSTRAINT mothers_type_valid
        CHECK (type = 'MOTHER'),
    CONSTRAINT mothers_firstname_not_blank
        CHECK (BTRIM(firstname) <> ''),
    CONSTRAINT mothers_lastname_not_blank
        CHECK (BTRIM(lastname) <> ''),
    CONSTRAINT mothers_contact_required
        CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE UNIQUE INDEX mothers_email_case_insensitive_unique
    ON mothers (LOWER(email))
    WHERE email IS NOT NULL;

CREATE UNIQUE INDEX mothers_phone_unique
    ON mothers (phone)
    WHERE phone IS NOT NULL;

CREATE TRIGGER mothers_set_updated_at
    BEFORE UPDATE ON mothers
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE babies (
    id VARCHAR(100) PRIMARY KEY,
    type beneficiary_type NOT NULL DEFAULT 'BABY',
    pregnancy_id VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    birth_time TIME,
    birth_weight NUMERIC(6, 3),
    sex VARCHAR(20),
    birth_status birth_status NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT babies_beneficiary_fk
        FOREIGN KEY (id, type)
        REFERENCES beneficiaries(id, type)
        ON DELETE CASCADE,
    CONSTRAINT babies_type_valid
        CHECK (type = 'BABY')
);

CREATE FUNCTION enforce_beneficiary_subtype()
RETURNS TRIGGER AS $$
DECLARE
    current_type beneficiary_type;
BEGIN
    SELECT type
    INTO current_type
    FROM beneficiaries
    WHERE id = NEW.id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    IF current_type = 'MOTHER' AND NOT EXISTS (
        SELECT 1 FROM mothers WHERE id = NEW.id
    ) THEN
        RAISE EXCEPTION 'MOTHER beneficiary % requires a mothers record', NEW.id
            USING ERRCODE = '23514';
    END IF;

    IF current_type = 'BABY' AND NOT EXISTS (
        SELECT 1 FROM babies WHERE id = NEW.id
    ) THEN
        RAISE EXCEPTION 'BABY beneficiary % requires a babies record', NEW.id
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION prevent_orphaned_beneficiary()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'mothers'
       AND EXISTS (SELECT 1 FROM beneficiaries WHERE id = OLD.id)
       AND NOT EXISTS (SELECT 1 FROM mothers WHERE id = OLD.id) THEN
        RAISE EXCEPTION 'Beneficiary % requires its mothers record', OLD.id
            USING ERRCODE = '23514';
    END IF;

    IF TG_TABLE_NAME = 'babies'
       AND EXISTS (SELECT 1 FROM beneficiaries WHERE id = OLD.id)
       AND NOT EXISTS (SELECT 1 FROM babies WHERE id = OLD.id) THEN
        RAISE EXCEPTION 'Beneficiary % requires its subtype record', OLD.id
            USING ERRCODE = '23514';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER beneficiaries_subtype_required
    AFTER INSERT OR UPDATE OF type ON beneficiaries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION enforce_beneficiary_subtype();

CREATE CONSTRAINT TRIGGER mothers_prevent_orphaned_beneficiary
    AFTER DELETE ON mothers
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION prevent_orphaned_beneficiary();

CREATE CONSTRAINT TRIGGER babies_prevent_orphaned_beneficiary
    AFTER DELETE ON babies
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION prevent_orphaned_beneficiary();
