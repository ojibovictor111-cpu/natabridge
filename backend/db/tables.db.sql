-- NataBridge consolidated database schema reference
-- Last synchronized: 2026-09-15
-- This file is a view model for documentation and review only.
-- Do not execute this file or treat it as migration history.
-- The ordered files in db/migrations are the authoritative schema source.

-- =============================================================================
-- Source: db/migrations/001_create_identity_schema.sql
-- =============================================================================

-- Migration: Create identity and RBAC schema
-- Created: 2026-09-01
-- Description: Introduces roles, permissions, and their assignments for NataBridge access control.

CREATE TYPE role_scope AS ENUM (
    'PLATFORM',
    'INSTITUTION',
    'CLINICAL'
);

CREATE TYPE user_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'DISABLED'
);

CREATE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
    id UUID PRIMARY KEY,
    firebase_uid VARCHAR(128) NOT NULL UNIQUE,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    contact VARCHAR(30),
    status user_status NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX users_email_case_insensitive_unique
    ON users (LOWER(email));

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    scope role_scope NOT NULL,
    description TEXT,

    CONSTRAINT roles_name_scope_unique
        UNIQUE (name, scope),
    CONSTRAINT roles_id_scope_unique
        UNIQUE (id, scope)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    scope role_scope NOT NULL,
    description TEXT,

    CONSTRAINT permissions_name_scope_unique
        UNIQUE (name, scope),
    CONSTRAINT permissions_id_scope_unique
        UNIQUE (id, scope)
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    scope role_scope NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT role_permissions_role_scope_fk
        FOREIGN KEY (role_id, scope)
        REFERENCES roles(id, scope)
        ON DELETE CASCADE,
    CONSTRAINT role_permissions_permission_scope_fk
        FOREIGN KEY (permission_id, scope)
        REFERENCES permissions(id, scope)
        ON DELETE CASCADE
);

CREATE INDEX role_permissions_permission_idx
    ON role_permissions (permission_id);

CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    scope role_scope NOT NULL,
    institution_id UUID,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_roles_role_scope_fk
        FOREIGN KEY (role_id, scope)
        REFERENCES roles(id, scope)
        ON DELETE CASCADE,
    CONSTRAINT user_roles_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT user_roles_scope_context_valid
        CHECK (
            (scope = 'PLATFORM' AND institution_id IS NULL)
            OR
            (scope IN ('INSTITUTION', 'CLINICAL') AND institution_id IS NOT NULL)
        )
);

CREATE UNIQUE INDEX user_roles_platform_assignment_unique
    ON user_roles (user_id, role_id)
    WHERE institution_id IS NULL;

CREATE UNIQUE INDEX user_roles_institution_assignment_unique
    ON user_roles (user_id, role_id, institution_id)
    WHERE institution_id IS NOT NULL;

CREATE INDEX user_roles_role_idx
    ON user_roles (role_id);

CREATE INDEX user_roles_user_idx
    ON user_roles (user_id);

CREATE INDEX user_roles_institution_idx
    ON user_roles (institution_id)
    WHERE institution_id IS NOT NULL;

-- =============================================================================
-- Source: db/migrations/002_create_institution_schema.sql
-- =============================================================================

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
    id UUID PRIMARY KEY,
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
    id UUID PRIMARY KEY,
    institution_id UUID NOT NULL,
    submitted_by UUID NOT NULL,
    reviewed_by UUID,
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

-- =============================================================================
-- Source: db/migrations/003_create_practitioner_schema.sql
-- =============================================================================

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

-- =============================================================================
-- Source: db/migrations/004_create_beneficiary_schema.sql
-- =============================================================================

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
    id UUID PRIMARY KEY,
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
    id UUID PRIMARY KEY,
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
    id UUID PRIMARY KEY,
    type beneficiary_type NOT NULL DEFAULT 'BABY',
    pregnancy_id UUID NOT NULL,
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

-- =============================================================================
-- Source: db/migrations/005_create_maternal_care_schema.sql
-- =============================================================================

-- Migration: Create maternal care schema
-- Created: 2026-09-01
-- Description: Introduces pregnancies, maternal complications, and pregnancy complication records for NataBridge.

CREATE TYPE pregnancy_status AS ENUM (
    'ONGOING',
    'COMPLETED',
    'TERMINATED'
);

CREATE TABLE pregnancies (
    id UUID PRIMARY KEY,
    mother_id UUID NOT NULL,
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
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT
);

CREATE TABLE pregnancy_complications (
    id UUID PRIMARY KEY,
    pregnancy_id UUID NOT NULL,
    complication_id UUID NOT NULL,
    diagnosed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(30),
    notes TEXT,
    resolved_at TIMESTAMPTZ,
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

-- =============================================================================
-- Source: db/migrations/006_create_care_delivery_schema.sql
-- =============================================================================

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

-- =============================================================================
-- Source: db/migrations/007_create_referral_schema.sql
-- =============================================================================

-- Migration: Create referrals schema
-- Created: 2026-09-01
-- Description: Introduces beneficiary referrals between healthcare institutions and tracks their lifecycle.

CREATE TYPE referral_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'DECLINED',
    'IN_TRANSIT',
    'ARRIVED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TABLE referrals (
    id UUID PRIMARY KEY,
    beneficiary_id UUID NOT NULL,
    pregnancy_id UUID,
    from_institution_id UUID NOT NULL,
    to_institution_id UUID NOT NULL,
    referred_by UUID NOT NULL,
    reason TEXT NOT NULL,
    priority VARCHAR(30) NOT NULL,
    status referral_status NOT NULL DEFAULT 'PENDING',
    referred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,

    CONSTRAINT referrals_beneficiary_fk
        FOREIGN KEY (beneficiary_id)
        REFERENCES beneficiaries(id)
        ON DELETE RESTRICT,
    CONSTRAINT referrals_pregnancy_fk
        FOREIGN KEY (pregnancy_id)
        REFERENCES pregnancies(id)
        ON DELETE RESTRICT,
    CONSTRAINT referrals_from_institution_fk
        FOREIGN KEY (from_institution_id)
        REFERENCES institutions(id)
        ON DELETE RESTRICT,
    CONSTRAINT referrals_to_institution_fk
        FOREIGN KEY (to_institution_id)
        REFERENCES institutions(id)
        ON DELETE RESTRICT,
    CONSTRAINT referrals_referrer_fk
        FOREIGN KEY (referred_by)
        REFERENCES practitioners(id)
        ON DELETE RESTRICT,
    CONSTRAINT referrals_acceptance_chronology_valid
        CHECK (accepted_at IS NULL OR accepted_at >= referred_at),
    CONSTRAINT referrals_completion_chronology_valid
        CHECK (
            completed_at IS NULL
            OR (
                completed_at >= referred_at
                AND (accepted_at IS NULL OR completed_at >= accepted_at)
            )
        ),
    CONSTRAINT referrals_distinct_institutions
        CHECK (from_institution_id <> to_institution_id)
);

CREATE INDEX referrals_beneficiary_referred_at_idx
    ON referrals (beneficiary_id, referred_at DESC);

CREATE INDEX referrals_pregnancy_idx
    ON referrals (pregnancy_id)
    WHERE pregnancy_id IS NOT NULL;

CREATE INDEX referrals_from_institution_status_idx
    ON referrals (from_institution_id, status);

CREATE INDEX referrals_to_institution_status_idx
    ON referrals (to_institution_id, status);

CREATE INDEX referrals_referrer_idx
    ON referrals (referred_by);

-- =============================================================================
-- Source: db/migrations/008_create_scheduling_schema.sql
-- =============================================================================

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
    scheduled_at TIMESTAMPTZ NOT NULL,
    status appointment_status NOT NULL DEFAULT 'SCHEDULED',
    notes TEXT,
    created_by UUID NOT NULL,
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

-- =============================================================================
-- Source: db/migrations/009_create_clinical_ai_schema.sql
-- =============================================================================

-- Migration: Create clinical and AI schema
-- Created: 2026-09-01
-- Description: Introduces prediction runs, clinical assessments, structured AI results, and explainability factors.

CREATE TYPE prediction_run_source AS ENUM (
    'standalone',
    'patient_assessment'
);

CREATE TYPE prediction_run_status AS ENUM (
    'pending',
    'completed',
    'failed'
);

-- Tracks every request sent to the prediction service, including failed and standalone attempts that are not associated with a beneficiary assessment.
CREATE TABLE prediction_runs (
    id UUID PRIMARY KEY,
    source prediction_run_source NOT NULL,
    status prediction_run_status NOT NULL DEFAULT 'pending',
    created_by_user_id UUID,
    request_id VARCHAR(100) NOT NULL,

    age NUMERIC(5, 2) NOT NULL,
    systolic_bp NUMERIC(6, 2) NOT NULL,
    diastolic_bp NUMERIC(6, 2) NOT NULL,
    blood_sugar NUMERIC(6, 2) NOT NULL,
    body_temperature_celsius NUMERIC(5, 2) NOT NULL,
    heart_rate NUMERIC(6, 2) NOT NULL,

    failure_code VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,

    CONSTRAINT prediction_runs_request_id_unique
        UNIQUE (request_id),
    CONSTRAINT prediction_runs_source_user_valid
        CHECK (
            (source = 'standalone' AND created_by_user_id IS NULL)
            OR
            (source = 'patient_assessment' AND created_by_user_id IS NOT NULL)
        ),
    CONSTRAINT prediction_runs_age_valid
        CHECK (age BETWEEN 10 AND 70),
    CONSTRAINT prediction_runs_systolic_bp_valid
        CHECK (systolic_bp BETWEEN 60 AND 250),
    CONSTRAINT prediction_runs_diastolic_bp_valid
        CHECK (diastolic_bp BETWEEN 30 AND 150),
    CONSTRAINT prediction_runs_blood_sugar_valid
        CHECK (blood_sugar >= 2),
    CONSTRAINT prediction_runs_body_temperature_valid
        CHECK (body_temperature_celsius BETWEEN 36 AND 43),
    CONSTRAINT prediction_runs_heart_rate_valid
        CHECK (heart_rate BETWEEN 30 AND 220),
    CONSTRAINT prediction_runs_lifecycle_valid
        CHECK (
            (
                status = 'pending'
                AND completed_at IS NULL
                AND failed_at IS NULL
                AND failure_code IS NULL
            )
            OR
            (
                status = 'completed'
                AND completed_at IS NOT NULL
                AND failed_at IS NULL
                AND failure_code IS NULL
            )
            OR
            (
                status = 'failed'
                AND completed_at IS NULL
                AND failed_at IS NOT NULL
                AND failure_code IS NOT NULL
            )
        ),
    CONSTRAINT prediction_runs_completion_chronology_valid
        CHECK (completed_at IS NULL OR completed_at >= created_at),
    CONSTRAINT prediction_runs_failure_chronology_valid
        CHECK (failed_at IS NULL OR failed_at >= created_at),
    CONSTRAINT prediction_runs_creator_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
);

CREATE INDEX prediction_runs_creator_created_at_idx
    ON prediction_runs (created_by_user_id, created_at DESC)
    WHERE created_by_user_id IS NOT NULL;

CREATE INDEX prediction_runs_source_status_created_at_idx
    ON prediction_runs (source, status, created_at DESC);

-- Stores the clinical context for a beneficiary assessment. The model inputs and execution lifecycle remain on the associated prediction run.
CREATE TABLE assessments (
    id UUID PRIMARY KEY,
    beneficiary_id UUID NOT NULL,
    pregnancy_id UUID,
    clinical_visit_id UUID,
    prediction_run_id UUID NOT NULL UNIQUE,
    created_by_user_id UUID NOT NULL,

    gestational_age NUMERIC(5, 2),
    first_pregnancy BOOLEAN,
    previous_complications TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT assessments_gestational_age_valid
        CHECK (gestational_age IS NULL OR gestational_age BETWEEN 1 AND 45),
    CONSTRAINT assessments_beneficiary_fk
        FOREIGN KEY (beneficiary_id)
        REFERENCES beneficiaries(id)
        ON DELETE RESTRICT,
    CONSTRAINT assessments_pregnancy_fk
        FOREIGN KEY (pregnancy_id)
        REFERENCES pregnancies(id)
        ON DELETE RESTRICT,
    CONSTRAINT assessments_clinical_visit_fk
        FOREIGN KEY (clinical_visit_id)
        REFERENCES clinical_visits(id)
        ON DELETE RESTRICT,
    CONSTRAINT assessments_prediction_run_fk
        FOREIGN KEY (prediction_run_id)
        REFERENCES prediction_runs(id)
        ON DELETE RESTRICT,
    CONSTRAINT assessments_creator_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
);

CREATE INDEX assessments_beneficiary_created_at_idx
    ON assessments (beneficiary_id, created_at DESC);

CREATE INDEX assessments_pregnancy_idx
    ON assessments (pregnancy_id)
    WHERE pregnancy_id IS NOT NULL;

CREATE INDEX assessments_clinical_visit_idx
    ON assessments (clinical_visit_id)
    WHERE clinical_visit_id IS NOT NULL;

CREATE INDEX assessments_creator_created_at_idx
    ON assessments (created_by_user_id, created_at DESC);

-- Stores the single structured model output produced by a successful run.
CREATE TABLE prediction_results (
    id UUID PRIMARY KEY,
    prediction_run_id UUID NOT NULL UNIQUE,
    prediction VARCHAR(30) NOT NULL,
    confidence NUMERIC(6, 5) NOT NULL,
    low_risk_probability NUMERIC(6, 5) NOT NULL,
    mid_risk_probability NUMERIC(6, 5) NOT NULL,
    high_risk_probability NUMERIC(6, 5) NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    response_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT prediction_results_risk_valid
        CHECK (prediction IN ('Low Risk', 'Mid Risk', 'High Risk')),
    CONSTRAINT prediction_results_confidence_valid
        CHECK (confidence BETWEEN 0 AND 1),
    CONSTRAINT prediction_results_low_probability_valid
        CHECK (low_risk_probability BETWEEN 0 AND 1),
    CONSTRAINT prediction_results_mid_probability_valid
        CHECK (mid_risk_probability BETWEEN 0 AND 1),
    CONSTRAINT prediction_results_high_probability_valid
        CHECK (high_risk_probability BETWEEN 0 AND 1),
    CONSTRAINT prediction_results_probabilities_sum_valid
        CHECK (
            ABS(
                low_risk_probability
                + mid_risk_probability
                + high_risk_probability
                - 1
            ) <= 0.001
        ),
    CONSTRAINT prediction_results_payload_is_object
        CHECK (JSONB_TYPEOF(response_payload) = 'object'),
    CONSTRAINT prediction_results_run_fk
        FOREIGN KEY (prediction_run_id)
        REFERENCES prediction_runs(id)
        ON DELETE CASCADE
);

-- Stores queryable explainability factors separately from the complete JSONB response retained on prediction_results.
CREATE TABLE prediction_factors (
    id UUID PRIMARY KEY,
    prediction_result_id UUID NOT NULL,
    feature VARCHAR(100) NOT NULL,
    impact NUMERIC(10, 5) NOT NULL,

    CONSTRAINT prediction_factors_feature_not_blank
        CHECK (BTRIM(feature) <> ''),
    CONSTRAINT prediction_factors_result_feature_unique
        UNIQUE (prediction_result_id, feature),
    CONSTRAINT prediction_factors_result_fk
        FOREIGN KEY (prediction_result_id)
        REFERENCES prediction_results(id)
        ON DELETE CASCADE
);

CREATE INDEX prediction_factors_result_idx
    ON prediction_factors (prediction_result_id);

-- =============================================================================
-- Source: db/migrations/010_create_system_schema.sql
-- =============================================================================

-- Migration: Create system schema
-- Created: 2026-09-01
-- Description: Introduces immutable audit records for changes made across NataBridge.

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    actor_user_id UUID,
    institution_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT audit_logs_actor_fk
        FOREIGN KEY (actor_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT audit_logs_institution_fk
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON DELETE RESTRICT,
    CONSTRAINT audit_logs_old_values_is_object
        CHECK (old_values IS NULL OR JSONB_TYPEOF(old_values) = 'object'),
    CONSTRAINT audit_logs_new_values_is_object
        CHECK (new_values IS NULL OR JSONB_TYPEOF(new_values) = 'object')
);

CREATE INDEX audit_logs_entity_idx
    ON audit_logs (entity_type, entity_id);

CREATE INDEX audit_logs_actor_created_at_idx
    ON audit_logs (actor_user_id, created_at DESC);

CREATE INDEX audit_logs_institution_created_at_idx
    ON audit_logs (institution_id, created_at DESC)
    WHERE institution_id IS NOT NULL;

CREATE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only'
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
    BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION prevent_audit_log_mutation();

