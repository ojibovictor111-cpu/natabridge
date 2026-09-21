import { getAuth } from "firebase-admin/auth";
import type { PoolClient } from "pg";
import { uuidv7 } from "uuidv7";
import { getFirebaseApp } from "../configs/firebase.config";
import { buildServer } from "../server";
import { withTransaction } from "./transaction";

const PLATFORM_ADMIN_ROLE_ID = "rol-platform-admin";

type AdminIdentity = {
	uid: string;
	email: string;
	firstName: string;
	lastName: string;
};

const requiredEnv = (name: string, maxLength: number): string => {
	const value = process.env[name]?.trim();
	if (!value || value.length > maxLength) {
		throw new Error(`${name} must contain 1 to ${maxLength} characters.`);
	}
	return value;
};

const assignFirstPlatformAdmin = async (
	client: PoolClient,
	identity: AdminIdentity,
): Promise<{ id: string; created: boolean }> => {
	// Lock the role row so concurrent bootstrap runs cannot assign two first admins.
	const role = await client.query<{ id: string }>(
		"SELECT id FROM roles WHERE id = $1 AND name = 'PLATFORM_ADMIN' AND scope = 'PLATFORM' FOR UPDATE",
		[PLATFORM_ADMIN_ROLE_ID],
	);
	if (role.rows.length !== 1) {
		throw new Error(
			"Platform admin role is missing. Run npm run db:migrate first.",
		);
	}

	const assignments = await client.query<{
		id: string;
		firebase_uid: string;
		email: string;
		status: string;
	}>(
		`SELECT users.id, users.firebase_uid, users.email, users.status
         FROM user_roles
         JOIN users ON users.id = user_roles.user_id
         WHERE user_roles.role_id = $1 AND user_roles.scope = 'PLATFORM'`,
		[PLATFORM_ADMIN_ROLE_ID],
	);
	if (assignments.rows.length > 0) {
		const existing = assignments.rows.find(
			(row) => row.firebase_uid === identity.uid,
		);
		if (existing && assignments.rows.length === 1) {
			if (
				existing.status !== "ACTIVE" ||
				existing.email.toLowerCase() !== identity.email.toLowerCase()
			) {
				throw new Error(
					"The existing platform admin account needs manual reconciliation.",
				);
			}
			return { id: existing.id, created: false };
		}
		throw new Error(
			"A platform admin is already assigned. The bootstrap command cannot grant another one.",
		);
	}

	const users = await client.query<{
		id: string;
		firebase_uid: string;
		email: string;
		status: string;
	}>(
		"SELECT id, firebase_uid, email, status FROM users WHERE firebase_uid = $1 OR LOWER(email) = LOWER($2) FOR UPDATE",
		[identity.uid, identity.email],
	);

	if (
		users.rows.some(
			(row) =>
				row.firebase_uid !== identity.uid ||
				row.email.toLowerCase() !== identity.email.toLowerCase(),
		)
	) {
		throw new Error(
			"A user already has this UID or email with different identity details. Reconcile that row manually.",
		);
	}
	const existingUser = users.rows[0];
	if (existingUser && existingUser.status !== "ACTIVE") {
		throw new Error("The matching database user is not active.");
	}

	const id = existingUser?.id ?? `usr-${uuidv7()}`;
	if (!existingUser) {
		await client.query(
			`INSERT INTO users (id, firebase_uid, firstname, lastname, email)
             VALUES ($1, $2, $3, $4, $5)`,
			[
				id,
				identity.uid,
				identity.firstName,
				identity.lastName,
				identity.email,
			],
		);
	}

	await client.query(
		"INSERT INTO user_roles (user_id, role_id, scope, institution_id) VALUES ($1, $2, 'PLATFORM', NULL)",
		[id, PLATFORM_ADMIN_ROLE_ID],
	);
	return { id, created: true };
};

const main = async () => {
	const uid = requiredEnv("BOOTSTRAP_PLATFORM_ADMIN_UID", 128);
	const firstName = requiredEnv("BOOTSTRAP_PLATFORM_ADMIN_FIRST_NAME", 100);
	const lastName = requiredEnv("BOOTSTRAP_PLATFORM_ADMIN_LAST_NAME", 100);

	const firebaseAuth = getAuth(getFirebaseApp());

	const firebaseUser = await firebaseAuth.getUser(uid);

	if (firebaseUser.disabled)
		throw new Error("The Firebase user is disabled.");

	if (!firebaseUser.email)
		throw new Error("The Firebase user does not have an email address.");

	if (!firebaseUser.emailVerified)
		throw new Error(
			`The Firebase email "${firebaseUser.email}" has not been verified.`,
		);

	if (firebaseUser.email.length > 255)
		throw new Error(
			"The Firebase user's email address exceeds the database limit.",
		);

	const server = buildServer({ logger: false });
	try {
		await server.ready();
		const result = await withTransaction(server, (client) =>
			assignFirstPlatformAdmin(client, {
				uid,
				email: firebaseUser.email!,
				firstName,
				lastName,
			}),
		);
		console.log(
			result.created
				? `Platform admin assigned to user ${result.id}.`
				: `Platform admin already assigned to user ${result.id}.`,
		);
	} finally {
		await server.close();
	}
};

if (require.main === module) {
	main().catch((error: unknown) => {
		console.error(
			error instanceof Error
				? error.message
				: "Platform admin bootstrap failed.",
		);
		process.exitCode = 1;
	});
}

export { assignFirstPlatformAdmin };
