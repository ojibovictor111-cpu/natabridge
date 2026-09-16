import type { AiApiResponse } from "../../ai/aiApiResponse.model";
import type { PredictionRequest } from "../dto/prediction.dto";
import type { PredictionRunSource } from "../prediction.model";

type CreatePredictionRunInput = PredictionRequest & {
     id: string;
     source: PredictionRunSource;
     createdByUserId: string | null;
     requestId: string;
};

type CreatePredictionResultInput = {
     id: string;
     predictionRunId: string;
     prediction: AiApiResponse;
};

export type {
     CreatePredictionResultInput,
     CreatePredictionRunInput
};
