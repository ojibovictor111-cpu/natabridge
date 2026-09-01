import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildServer } from "../server";
import { withTransaction } from "./transaction";

const migrationsDirectory = join(process.cwd(), "db", "migrations");

const ensureMigrationHistoryTable = async (
	server: ReturnType<typeof buildServer>,
): Promise<void> => {
	await server.pg.query(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id SERIAL PRIMARY KEY,
			migration_name VARCHAR(255) NOT NULL UNIQUE,
			executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);
};

const getMigrationFiles = async (): Promise<string[]> => {
	const entries = await readdir(migrationsDirectory, { withFileTypes: true });

	return entries
		.filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
		.map((entry) => entry.name)
		.sort((left, right) => left.localeCompare(right));
};

const getExecutedMigrations = async (
	server: ReturnType<typeof buildServer>,
): Promise<Set<string>> => {
	const result = await server.pg.query<{ migration_name: string }>(
		"SELECT migration_name FROM schema_migrations",
	);

	return new Set(result.rows.map((row) => row.migration_name));
};

const runMigrations = async (): Promise<void> => {
	const server = buildServer({ logger: false });

	try {
		await server.ready();
		await ensureMigrationHistoryTable(server);

		const migrationFiles = await getMigrationFiles();
		const executedMigrations = await getExecutedMigrations(server);
		const pendingMigrations = migrationFiles.filter(
			(migrationName) => !executedMigrations.has(migrationName),
		);

		if (pendingMigrations.length === 0) {
			console.log("Database is up to date. No pending migrations.");
			return;
		}

		for (const migrationName of pendingMigrations) {
			const migrationPath = join(migrationsDirectory, migrationName);
			const migrationSql = await readFile(migrationPath, "utf8");

			console.log(`Running migration: ${migrationName}`);

			await withTransaction(server, async (client) => {
				await client.query(migrationSql);
				await client.query(
					"INSERT INTO schema_migrations (migration_name) VALUES ($1)",
					[migrationName],
				);
			});

			console.log(`Completed migration: ${migrationName}`);
		}

		console.log(`Successfully ran ${pendingMigrations.length} migration(s).`);
	} finally {
		await server.close();
	}
};

runMigrations().catch((error: unknown) => {
	console.error("Migration failed. The current migration was rolled back.");
	console.error(error);
	process.exitCode = 1;
});
