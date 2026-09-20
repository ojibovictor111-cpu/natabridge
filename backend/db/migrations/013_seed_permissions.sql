-- Seed the permission catalog by role scope. This migration defines permissions
-- only; role_permissions assignments are managed separately.
WITH permission_seed (name, scope, description) AS (
    VALUES
    -- PLATFORM: authority across institutions, without automatic clinical access.
    ('platform.institutions.read', 'PLATFORM', 'View the institution directory and onboarding status'),
    ('platform.institutions.review', 'PLATFORM', 'Approve or reject institution onboarding'),
    ('platform.institutions.status', 'PLATFORM', 'Suspend or reactivate institutions'),
    ('platform.practitioners.review', 'PLATFORM', 'Approve or reject practitioner onboarding'),
    ('platform.users.read', 'PLATFORM', 'View the platform user directory'),
    ('platform.users.status', 'PLATFORM', 'Suspend or reactivate user accounts'),
    ('platform.roles.define', 'PLATFORM', 'Define platform roles and permission mappings'),
    ('platform.roles.assign', 'PLATFORM', 'Grant or revoke platform roles'),
    ('platform.reference_data.manage', 'PLATFORM', 'Maintain shared clinical and scheduling reference data'),
    ('platform.audit.read', 'PLATFORM', 'Read platform-wide audit records'),
    ('platform.analytics.read', 'PLATFORM', 'Read platform-wide aggregate reports'),

    -- INSTITUTION: operational authority within the assigned institution.
    ('institution.profile.read', 'INSTITUTION', 'View institution details'),
    ('institution.profile.update', 'INSTITUTION', 'Update institution details'),
    ('institution.memberships.read', 'INSTITUTION', 'View staff memberships'),
    ('institution.memberships.manage', 'INSTITUTION', 'Add, suspend, or end staff memberships'),
    ('institution.roles.assign', 'INSTITUTION', 'Assign or revoke permitted local roles'),
    ('institution.practitioners.read', 'INSTITUTION', 'View institution practitioners'),
    ('institution.care_enrollments.manage', 'INSTITUTION', 'Manage beneficiary links to the institution'),
    ('institution.appointments.read', 'INSTITUTION', 'View the institution appointment schedule'),
    ('institution.appointments.manage', 'INSTITUTION', 'Schedule, reschedule, or cancel appointments'),
    ('institution.referrals.read', 'INSTITUTION', 'View incoming and outgoing referral queues'),
    ('institution.referrals.triage', 'INSTITUTION', 'Accept or decline incoming referrals'),
    ('institution.audit.read', 'INSTITUTION', 'Read institution audit records'),
    ('institution.analytics.read', 'INSTITUTION', 'Read institution aggregate reports'),

    -- CLINICAL: patient care within an authorized institution and care relationship.
    ('clinical.beneficiaries.read', 'CLINICAL', 'View accessible patient records'),
    ('clinical.beneficiaries.create', 'CLINICAL', 'Register patients'),
    ('clinical.beneficiaries.update', 'CLINICAL', 'Correct patient details'),
    ('clinical.pregnancies.read', 'CLINICAL', 'View pregnancy history'),
    ('clinical.pregnancies.manage', 'CLINICAL', 'Record pregnancy status and history'),
    ('clinical.complications.record', 'CLINICAL', 'Record pregnancy complications'),
    ('clinical.visits.read', 'CLINICAL', 'View clinical visits'),
    ('clinical.visits.create', 'CLINICAL', 'Record clinical visits'),
    ('clinical.visits.amend', 'CLINICAL', 'Amend recorded visits with an audit trail'),
    ('clinical.assessments.read', 'CLINICAL', 'View maternal and neonatal assessments'),
    ('clinical.assessments.create', 'CLINICAL', 'Record maternal and neonatal assessments'),
    ('clinical.predictions.run', 'CLINICAL', 'Run patient-linked risk predictions'),
    ('clinical.referrals.create', 'CLINICAL', 'Refer patients to another institution'),
    ('clinical.referrals.read', 'CLINICAL', 'View referrals for accessible patients'),
    ('clinical.referrals.complete', 'CLINICAL', 'Record referral outcomes'),
    ('clinical.appointments.read', 'CLINICAL', 'View relevant patient appointments'),
    ('clinical.records.export', 'CLINICAL', 'Export accessible patient records')
)
INSERT INTO permissions (id, name, scope, description)
SELECT
    'perm-' || REPLACE(name, '.', '-'),
    name,
    scope::role_scope,
    description
FROM permission_seed
ON CONFLICT (name, scope) DO UPDATE
SET description = EXCLUDED.description;
