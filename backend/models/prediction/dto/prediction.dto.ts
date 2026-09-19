import { Type } from "@fastify/type-provider-typebox";
import type { Static } from "@fastify/type-provider-typebox";

const predictionRequestSchema = Type.Object(
	{
		age: Type.Number({ minimum: 10, maximum: 70 }),
		systolicBP: Type.Number({ minimum: 60, maximum: 250 }),
		diastolicBP: Type.Number({ minimum: 30, maximum: 150 }),
		bloodSugar: Type.Number({ minimum: 2, maximum: 25 }),
		bodyTemp: Type.Number({ minimum: 36, maximum: 43 }),
		heartRate: Type.Number({ minimum: 30, maximum: 220 }),
	},
	{ additionalProperties: false },
);

type PredictionRequest = Static<typeof predictionRequestSchema>;

export { predictionRequestSchema };

export type { PredictionRequest };
