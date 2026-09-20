import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyRequest } from "fastify";
import { buildServer } from "../server";
import { createPermissionHook, findPermissionGrants } from "../utils/permissions";
import type { PermissionGrant } from "../utils/permissions";

const authenticatedServer = (findPermissionGrantsForTest: () => Promise<PermissionGrant[]>) =>
     buildServer({
          logger: false,
          verifyIdToken: async () => ({ uid: "firebase-test" }),
          findUserByFirebaseUid: async () => ({
               id: "usr-test", email: "test@example.com", status: "ACTIVE"
          }),
          findPermissionGrants: findPermissionGrantsForTest
     });

test("platform endpoints require a platform grant", async (context) => {
     let grants: PermissionGrant[] = [];
     const server = authenticatedServer(async () => grants);
     context.after(() => server.close());
     const call = () => server.inject({
          method: "GET", url: "/api/users",
          headers: { authorization: "Bearer valid" }
     });

     const denied = await call();
     assert.equal(denied.statusCode, 403);
     assert.equal(denied.json().code, "PERMISSION_DENIED");

     grants = [{ name: "platform.users.read", scope: "PLATFORM", institution_id: null }];
     const allowed = await call();
     assert.equal(allowed.statusCode, 200);
});

test("clinical grants require one authorized institution context", async (context) => {
     const grants: PermissionGrant[] = ["inst-a", "inst-b"].map((institution_id) => ({
          name: "clinical.assessments.read", scope: "CLINICAL", institution_id
     }));
     const server = authenticatedServer(async () => grants);
     context.after(() => server.close());
     const call = (institutionId?: string) => server.inject({
          method: "GET", url: "/api/clinicians/usr-other/assessments",
          headers: {
               authorization: "Bearer valid",
               ...(institutionId === undefined ? {} : { "x-institution-id": institutionId })
          }
     });

     assert.equal((await call()).json().code, "INSTITUTION_CONTEXT_REQUIRED");
     assert.equal((await call("inst-foreign")).json().code, "PERMISSION_DENIED");
     assert.equal((await call("inst-a")).json().code, "FORBIDDEN");
});

test("permission lookup filters inactive memberships and institutions", async () => {
     let sql = "";
     let values: unknown[] = [];
     const request = {
          server: { pg: { query: async (query: string, parameters: unknown[]) => {
               sql = query;
               values = parameters;
               return { rows: [] };
          } } }
     } as unknown as FastifyRequest;

     await findPermissionGrants(request, "usr-test");
     assert.match(sql, /im\.status = 'ACTIVE'/);
     assert.match(sql, /i\.status = 'ACTIVE'/);
     assert.match(sql, /p\.scope = rp\.scope/);
     assert.deepEqual(values, ["usr-test"]);
});

test("patient assessment creation requires every grant in the same institution", async () => {
     const request = {
          user: { id: "usr-test", email: "test@example.com", firebaseUid: "firebase-test" },
          institutionId: null,
          headers: { "x-institution-id": "inst-a" }
     } as unknown as FastifyRequest;
     const hook = createPermissionHook(
          ["clinical.beneficiaries.read", "clinical.assessments.create", "clinical.predictions.run"],
          async () => [
               { name: "clinical.beneficiaries.read", scope: "CLINICAL", institution_id: "inst-a" },
               { name: "clinical.assessments.create", scope: "CLINICAL", institution_id: "inst-a" },
               { name: "clinical.predictions.run", scope: "CLINICAL", institution_id: "inst-b" }
          ]
     );

     await assert.rejects(hook(request), { statusCode: 403, code: "PERMISSION_DENIED" });
     assert.equal(request.institutionId, null);
});
