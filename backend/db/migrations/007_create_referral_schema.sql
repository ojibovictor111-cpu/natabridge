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
    referred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
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
        ON DELETE RESTRICT
);
