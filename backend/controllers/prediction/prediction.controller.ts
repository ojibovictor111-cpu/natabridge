import type { FastifyReply, FastifyRequest } from "fastify";
import type { PredictionRequest } from "../../models/prediction/dto/prediction.dto";
import { processPrediction } from "../../services/prediction/prediction.service";

const postPrediction = async (
	request: FastifyRequest<{ Body: PredictionRequest }>,
	reply: FastifyReply,
) => {
	const result = await processPrediction(
		request.server,
		request.body,
		request.id,
	);

	return reply.code(201).send({
		data: result,
	});
};

export { postPrediction };
