import { describe, expect, it } from 'vitest';
import type { UserRoleApi } from '../../models/user/User.api';
import { hasAllPermissions, hasAnyPermission } from './access';

const roles: UserRoleApi[] = [
  {
    id: 'platform-role',
    name: 'PLATFORM_ADMIN',
    scope: 'PLATFORM',
    institutionId: null,
    permissions: ['platform.users.read'],
  },
  {
    id: 'clinical-role-a',
    name: 'CLINICIAN',
    scope: 'CLINICAL',
    institutionId: 'institution-a',
    permissions: ['clinical.beneficiaries.read', 'clinical.assessments.create'],
  },
  {
    id: 'clinical-role-b',
    name: 'CLINICIAN',
    scope: 'CLINICAL',
    institutionId: 'institution-b',
    permissions: ['clinical.predictions.run'],
  },
];

describe('permission helpers', () => {
  it('combines platform permissions with roles in the active institution', () => {
    expect(
      hasAllPermissions(
        roles,
        ['platform.users.read', 'clinical.beneficiaries.read'],
        'institution-a',
      ),
    ).toBe(true);
  });

  it('does not combine permissions from different institutions', () => {
    expect(
      hasAllPermissions(
        roles,
        ['clinical.assessments.create', 'clinical.predictions.run'],
        'institution-a',
      ),
    ).toBe(false);
  });

  it('supports any-permission checks for navigation groups', () => {
    expect(
      hasAnyPermission(
        roles,
        ['clinical.assessments.read', 'clinical.beneficiaries.read'],
        'institution-a',
      ),
    ).toBe(true);
  });
});
