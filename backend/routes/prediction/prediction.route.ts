import type { FastifyInstance } from "fastify";
import { postPrediction } from "../../controllers/prediction/prediction.controller";
import { predictionRequestSchema } from "../../models/prediction/dto/prediction.dto";

export async function predictionRoutes(fastify: FastifyInstance) {
	fastify.post(
		"",
		{
			schema: {
				body: predictionRequestSchema,
			},
		},
		postPrediction,
	);
}
