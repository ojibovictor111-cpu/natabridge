export type UserRoleScope = 'PLATFORM' | 'INSTITUTION' | 'CLINICAL';

export interface UserRoleApi {
  id: string;
  name: string;
  scope: UserRoleScope;
  institutionId: string | null;
  permissions: string[];
}

interface UserApi {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  roles: UserRoleApi[];
}

export type { UserApi };
