import type { FastifyRequest } from "fastify";

type RoleScope = "PLATFORM" | "INSTITUTION" | "CLINICAL";

type UserRolePermissionRow = {
     role_id: string;
     role_name: string;
     scope: RoleScope;
     institution_id: string | null;
     permission_name: string | null;
};

type UserRoleAccess = {
     id: string;
     name: string;
     scope: RoleScope;
     institutionId: string | null;
     permissions: string[];
};

type UserAccess = { roles: UserRoleAccess[] };
type FindUserAccess = (request: FastifyRequest, userId: string) => Promise<UserAccess>;

const findUserAccess: FindUserAccess = async (request, userId) => {
     const result = await request.server.pg.query<UserRolePermissionRow>(`
          SELECT
               r.id AS role_id,
               r.name AS role_name,
               r.scope,
               ur.institution_id,
               p.name AS permission_name
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id AND r.scope = ur.scope
          LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.scope = r.scope
          LEFT JOIN permissions p ON p.id = rp.permission_id AND p.scope = rp.scope
          LEFT JOIN institutions i ON i.id = ur.institution_id
          WHERE ur.user_id = $1
            AND (
                 (ur.scope = 'PLATFORM' AND ur.institution_id IS NULL)
                 OR (
                      ur.scope IN ('INSTITUTION', 'CLINICAL')
                      AND i.status = 'ACTIVE'
                      AND EXISTS (
                           SELECT 1 FROM institution_memberships im
                           WHERE im.user_id = ur.user_id
                             AND im.institution_id = ur.institution_id
                             AND im.status = 'ACTIVE'
                             AND im.ended_at IS NULL
                      )
                 )
            )
          ORDER BY r.scope, r.name, ur.institution_id, p.name
     `, [userId]);

     const roles = new Map<string, UserRoleAccess>();
     for (const row of result.rows) {
          const key = `${row.role_id}:${row.institution_id ?? "PLATFORM"}`;
          let role = roles.get(key);
          if (role === undefined) {
               role = {
                    id: row.role_id,
                    name: row.role_name,
                    scope: row.scope,
                    institutionId: row.institution_id,
                    permissions: []
               };
               roles.set(key, role);
          }
          if (row.permission_name !== null) role.permissions.push(row.permission_name);
     }

     return { roles: [...roles.values()] };
};

export { findUserAccess };
export type { FindUserAccess, RoleScope, UserAccess, UserRoleAccess };
