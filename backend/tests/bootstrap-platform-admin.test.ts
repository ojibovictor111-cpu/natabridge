import assert from "node:assert/strict";
import test from "node:test";
import type { PoolClient } from "pg";
import { assignFirstPlatformAdmin } from "../db/bootstrap-platform-admin";

const identity = {
    uid: "firebase-admin-uid",
    email: "admin@natabridge.com",
    firstName: "Ada",
    lastName: "Admin"
};

test("bootstrap refuses to run before the platform role migration", async () => {
    const client = {
        query: async () => ({ rows: [] })
    } as unknown as PoolClient;

    await assert.rejects(
        assignFirstPlatformAdmin(client, identity),
        /Run npm run db:migrate first/
    );
});

test("bootstrap will not grant a second UID the first platform admin role", async () => {
    const queries: string[] = [];
    const client = {
        query: async (sql: string) => {
            queries.push(sql);
            if (sql.includes("FROM roles")) return { rows: [{ id: "rol-platform-admin" }] };
            if (sql.includes("FROM user_roles")) return {
                rows: [{ id: "usr-existing", firebase_uid: "another-uid", email: "other@natabridge.com", status: "ACTIVE" }]
            };
            throw new Error("No user may be inserted");
        }
    } as unknown as PoolClient;

    await assert.rejects(
        assignFirstPlatformAdmin(client, identity),
        /already assigned/
    );
    assert.equal(queries.length, 2);
});

test("bootstrap is idempotent for the same Firebase UID", async () => {
    const client = {
        query: async (sql: string) => {
            if (sql.includes("FROM roles")) return { rows: [{ id: "rol-platform-admin" }] };
            if (sql.includes("FROM user_roles")) return {
                rows: [{ id: "usr-admin", firebase_uid: identity.uid, email: identity.email, status: "ACTIVE" }]
            };
            throw new Error("No user may be inserted");
        }
    } as unknown as PoolClient;

    assert.deepEqual(await assignFirstPlatformAdmin(client, identity), {
        id: "usr-admin",
        created: false
    });
});

test("bootstrap inserts a new user and a platform-scoped role assignment", async () => {
    const inserts: { sql: string; params: unknown[] }[] = [];
    const client = {
        query: async (sql: string, params: unknown[]) => {
            if (sql.includes("FROM roles")) return { rows: [{ id: "rol-platform-admin" }] };
            if (sql.includes("FROM user_roles") || sql.includes("FROM users")) return { rows: [] };
            inserts.push({ sql, params });
            return { rows: [] };
        }
    } as unknown as PoolClient;

    const result = await assignFirstPlatformAdmin(client, identity);
    assert.equal(result.created, true);
    assert.match(result.id, /^usr-/);
    assert.equal(inserts.length, 2);
    assert.deepEqual(inserts[0]?.params, [
        result.id, identity.uid, identity.firstName, identity.lastName, identity.email
    ]);
    assert.deepEqual(inserts[1]?.params, [result.id, "rol-platform-admin"]);
    assert.match(inserts[1]!.sql, /'PLATFORM', NULL/);
});

test("bootstrap refuses to link a matching email to another Firebase UID", async () => {
    const client = {
        query: async (sql: string) => {
            if (sql.includes("FROM roles")) return { rows: [{ id: "rol-platform-admin" }] };
            if (sql.includes("FROM user_roles")) return { rows: [] };
            if (sql.includes("FROM users")) return {
                rows: [{
                    id: "usr-demo",
                    firebase_uid: "demo:jane@natabridge.com",
                    email: identity.email,
                    status: "ACTIVE"
                }]
            };
            throw new Error("No user may be inserted");
        }
    } as unknown as PoolClient;

    await assert.rejects(
        assignFirstPlatformAdmin(client, identity),
        /Reconcile that row manually/
    );
});
