import type { UserRoleApi } from '../../models/user/User.api';

export const ACCESS = {
  platform: {
    dashboard: ['platform.analytics.read'],
    institutions: {
      list: ['platform.institutions.read'],
      view: ['platform.institutions.read'],
      create: ['platform.institutions.create'],
      review: ['platform.institutions.review'],
      changeStatus: ['platform.institutions.status'],
      inviteAdmin: ['platform.institution_admins.invite'],
    },
    practitioners: {
      review: ['platform.practitioners.review'],
    },
    users: {
      list: ['platform.users.read'],
      view: ['platform.users.read'],
      changeStatus: ['platform.users.status'],
    },
    roles: {
      configure: ['platform.roles.define'],
      assign: ['platform.roles.assign'],
    },
    referenceData: {
      manage: ['platform.reference_data.manage'],
    },
    audit: {
      view: ['platform.audit.read'],
    },
  },
  institution: {
    dashboard: ['institution.analytics.read'],
    profile: {
      view: ['institution.profile.read'],
      update: ['institution.profile.update'],
    },
    staff: {
      list: ['institution.memberships.read'],
      invite: ['institution.memberships.manage'],
      suspend: ['institution.memberships.manage'],
      remove: ['institution.memberships.manage'],
      assignRole: ['institution.roles.assign'],
    },
    practitioners: {
      list: ['institution.practitioners.read'],
    },
    careEnrollments: {
      manage: ['institution.care_enrollments.manage'],
    },
    appointments: {
      list: ['institution.appointments.read'],
      create: ['institution.appointments.manage'],
      update: ['institution.appointments.manage'],
      cancel: ['institution.appointments.manage'],
    },
    referrals: {
      list: ['institution.referrals.read'],
      triage: ['institution.referrals.triage'],
    },
    audit: {
      view: ['institution.audit.read'],
    },
  },
  clinical: {
    patients: {
      list: ['clinical.beneficiaries.read'],
      view: ['clinical.beneficiaries.read'],
      create: ['clinical.beneficiaries.create'],
      update: ['clinical.beneficiaries.update'],
    },
    assessments: {
      list: ['clinical.assessments.read'],
      view: ['clinical.assessments.read'],
      createForExistingPatient: [
        'clinical.beneficiaries.read',
        'clinical.assessments.create',
        'clinical.predictions.run',
      ],
      createWithNewPatient: [
        'clinical.beneficiaries.create',
        'clinical.assessments.create',
        'clinical.predictions.run',
      ],
    },
    pregnancies: {
      view: ['clinical.pregnancies.read'],
      manage: ['clinical.pregnancies.manage'],
      recordComplication: ['clinical.complications.record'],
    },
    visits: {
      list: ['clinical.visits.read'],
      create: ['clinical.visits.create'],
      amend: ['clinical.visits.amend'],
    },
    referrals: {
      create: ['clinical.referrals.create'],
      list: ['clinical.referrals.read'],
      complete: ['clinical.referrals.complete'],
    },
    appointments: {
      list: ['clinical.appointments.read'],
    },
    records: {
      export: ['clinical.records.export'],
    },
  },
} as const;

export function hasAllPermissions(
  roles: readonly UserRoleApi[],
  required: readonly string[],
  institutionId: string | null = null,
): boolean {
  const permissions = permissionsForContext(roles, institutionId);

  return required.every((permission) => permissions.has(permission));
}

export function hasAnyPermission(
  roles: readonly UserRoleApi[],
  required: readonly string[],
  institutionId: string | null = null,
): boolean {
  const permissions = permissionsForContext(roles, institutionId);

  return required.some((permission) => permissions.has(permission));
}

function permissionsForContext(
  roles: readonly UserRoleApi[],
  institutionId: string | null,
): Set<string> {
  return new Set(
    roles
      .filter((role) => role.scope === 'PLATFORM' || role.institutionId === institutionId)
      .flatMap((role) => role.permissions),
  );
}
