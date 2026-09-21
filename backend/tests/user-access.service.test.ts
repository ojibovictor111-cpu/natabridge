import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyRequest } from "fastify";
import { findUserAccess } from "../services/user/user-access.service";

test("current user access groups permissions by role and institution", async () => {
     let sql = "";
     let values: unknown[] = [];
     const request = {
          server: { pg: { query: async (query: string, parameters: unknown[]) => {
               sql = query;
               values = parameters;
               return { rows: [
                    { role_id: "rol-platform-admin", role_name: "PLATFORM_ADMIN", scope: "PLATFORM", institution_id: null, permission_name: "platform.users.read" },
                    { role_id: "rol-clinician", role_name: "CLINICIAN", scope: "CLINICAL", institution_id: "inst-a", permission_name: "clinical.assessments.read" },
                    { role_id: "rol-clinician", role_name: "CLINICIAN", scope: "CLINICAL", institution_id: "inst-a", permission_name: "clinical.predictions.run" },
                    { role_id: "rol-clinician", role_name: "CLINICIAN", scope: "CLINICAL", institution_id: "inst-b", permission_name: null }
               ] };
          } } }
     } as unknown as FastifyRequest;

     const access = await findUserAccess(request, "usr-test");

     assert.deepEqual(values, ["usr-test"]);
     assert.match(sql, /im\.status = 'ACTIVE'/);
     assert.match(sql, /i\.status = 'ACTIVE'/);
     assert.deepEqual(access.roles, [
          {
               id: "rol-platform-admin",
               name: "PLATFORM_ADMIN",
               scope: "PLATFORM",
               institutionId: null,
               permissions: ["platform.users.read"]
          },
          {
               id: "rol-clinician",
               name: "CLINICIAN",
               scope: "CLINICAL",
               institutionId: "inst-a",
               permissions: ["clinical.assessments.read", "clinical.predictions.run"]
          },
          {
               id: "rol-clinician",
               name: "CLINICIAN",
               scope: "CLINICAL",
               institutionId: "inst-b",
               permissions: []
          }
     ]);
});
