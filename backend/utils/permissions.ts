import type { FastifyRequest } from "fastify";
import { ClientFacingError } from "../errors/api-error";

type RoleScope = "PLATFORM" | "INSTITUTION" | "CLINICAL";
type PermissionGrant = { name: string; scope: RoleScope; institution_id: string | null };
type FindPermissionGrants = (request: FastifyRequest, userId: string) => Promise<PermissionGrant[]>;

const findPermissionGrants: FindPermissionGrants = async (request, userId) => {
     const result = await request.server.pg.query<PermissionGrant>(`
          SELECT DISTINCT p.name, p.scope, ur.institution_id
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id AND r.scope = ur.scope
          JOIN role_permissions rp ON rp.role_id = r.id AND rp.scope = r.scope
          JOIN permissions p ON p.id = rp.permission_id AND p.scope = rp.scope
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
     `, [userId]);
     return result.rows;
};

const forbidden = () => new ClientFacingError({
     statusCode: 403,
     code: "PERMISSION_DENIED",
     message: "You do not have permission to access this resource."
});

const requireInstitutionId = (request: FastifyRequest): string => {
     if (request.institutionId === null) throw forbidden();
     return request.institutionId;
};

const createPermissionHook = (
     required: readonly string[],
     findGrants: FindPermissionGrants = findPermissionGrants
) => async (request: FastifyRequest) => {
     if (request.user === null) throw forbidden();
     const grants = await findGrants(request, request.user.id);
     const requestedInstitution = request.headers["x-institution-id"];
     if (requestedInstitution !== undefined &&
          (typeof requestedInstitution !== "string" || requestedInstitution.length === 0 || requestedInstitution.length > 100)) {
          throw new ClientFacingError({
               statusCode: 400,
               code: "INVALID_INSTITUTION_CONTEXT",
               message: "Provide a valid X-Institution-Id header."
          });
     }

     const scopes = new Set(required.map((name) => name.split(".")[0]?.toUpperCase()));
     if (scopes.size !== 1) throw new Error("A permission check must use one scope.");
     const scope = [...scopes][0] as RoleScope;
     if (scope === "PLATFORM") {
          if (!required.every((name) => grants.some((grant) => grant.name === name && grant.scope === scope && grant.institution_id === null))) {
               throw forbidden();
          }
          return;
     }

     const eligibleInstitutions = new Set(grants
          .filter((grant) => grant.scope === scope && grant.institution_id !== null)
          .map((grant) => grant.institution_id as string)
          .filter((institutionId) => required.every((name) => grants.some((grant) =>
               grant.name === name && grant.scope === scope && grant.institution_id === institutionId))));
     if (eligibleInstitutions.size === 0) throw forbidden();
     if (requestedInstitution !== undefined && !eligibleInstitutions.has(requestedInstitution)) throw forbidden();
     if (requestedInstitution === undefined && eligibleInstitutions.size !== 1) {
          throw new ClientFacingError({
               statusCode: 400,
               code: "INSTITUTION_CONTEXT_REQUIRED",
               message: "Select an institution using the X-Institution-Id header."
          });
     }
     request.institutionId = requestedInstitution ?? [...eligibleInstitutions][0] ?? null;
};

export { createPermissionHook, findPermissionGrants, requireInstitutionId };
export type { FindPermissionGrants, PermissionGrant };
