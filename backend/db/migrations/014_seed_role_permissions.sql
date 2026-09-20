-- Role grants stay within each role's scope. Users receive local roles only
-- through user_roles with an institution_id and an active membership.
INSERT INTO roles (id, name, scope, description)
VALUES
    ('rol-institution-admin', 'INSTITUTION_ADMIN', 'INSTITUTION', 'Manage one institution and its staff'),
    ('rol-clinician', 'CLINICIAN', 'CLINICAL', 'Provide routine care within an assigned institution'),
    ('rol-clinical-lead', 'CLINICAL_LEAD', 'CLINICAL', 'Provide and supervise care within an assigned institution')
ON CONFLICT (id) DO NOTHING;

WITH grants (role_name, scope, permission_name) AS (
    SELECT 'PLATFORM_ADMIN', 'PLATFORM', name FROM permissions WHERE scope = 'PLATFORM'
    UNION ALL
    SELECT 'INSTITUTION_ADMIN', 'INSTITUTION', name FROM permissions WHERE scope = 'INSTITUTION'
    UNION ALL
    SELECT 'CLINICAL_LEAD', 'CLINICAL', name FROM permissions WHERE scope = 'CLINICAL'
    UNION ALL
    SELECT 'CLINICIAN', 'CLINICAL', name FROM permissions
    WHERE scope = 'CLINICAL'
      AND name IN (
          'clinical.beneficiaries.read',
          'clinical.beneficiaries.create',
          'clinical.beneficiaries.update',
          'clinical.pregnancies.read',
          'clinical.pregnancies.manage',
          'clinical.complications.record',
          'clinical.visits.read',
          'clinical.visits.create',
          'clinical.assessments.read',
          'clinical.assessments.create',
          'clinical.predictions.run',
          'clinical.referrals.create',
          'clinical.referrals.read',
          'clinical.appointments.read'
      )
)
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, r.scope
FROM grants g
JOIN roles r ON r.name = g.role_name AND r.scope = g.scope::role_scope
JOIN permissions p ON p.name = g.permission_name AND p.scope = r.scope
ON CONFLICT (role_id, permission_id) DO NOTHING;
