import type { FastifyInstance } from "fastify";
import type { PoolClient } from "pg";

const withTransaction = async <T>(
	server: FastifyInstance,
	operation: (client: PoolClient) => Promise<T>,
): Promise<T> => {
	const client = await server.pg.connect();

	try {
		await client.query("BEGIN");
		const result = await operation(client);
		await client.query("COMMIT");
		return result;
	} catch (error) {
		try {
			await client.query("ROLLBACK");
		} catch (rollbackError) {
			throw new AggregateError(
				[error, rollbackError],
				"The database transaction and its rollback both failed.",
			);
		}

		throw error;
	} finally {
		client.release();
	}
};

export { withTransaction };
