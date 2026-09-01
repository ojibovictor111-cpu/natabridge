import type { FastifyInstance } from "fastify";
import { uuidv7 } from "uuidv7";
import { withTransaction } from "../../db/transaction";
import { ClientFacingError } from "../../errors/api-error";
import type { AiApiResponse } from "../../models/ai/aiApiResponse.model";
import type {
     CreatePatientAssessmentRequest,
     PatientAssessmentRequest
} from "../../models/assessment/dto/assessment.dto";
import type { PredictionRequest } from "../../models/prediction/dto/prediction.dto";
import type { PredictionRunSource } from "../../models/prediction/repo/prediction.repo";
import { createAssessment } from "../../repositories/assessment/assessment.repo";
import {
     createPatient,
     patientExists
} from "../../repositories/patient/patient.repo";
import {
     completePredictionRun,
     createPredictionFactors,
     createPredictionResult,
     createPredictionRun,
     failPredictionRun
} from "../../repositories/prediction.repo";
import { preparePatientForCreation } from "../patient/patient.service";

type PatientAssessmentContext = {
     patientId: string;
     createdByUserId: string;
     details: Pick<
          PatientAssessmentRequest,
          "gestationalAge" | "firstPregnancy" | "previousComplications"
     >;
};

type StoredPredictionOptions = {
     source: PredictionRunSource;
     createdByUserId: string | null;
     requestId?: string;
     assessment?: PatientAssessmentContext;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
     typeof value === "object" && value !== null;

const isNumber = (value: unknown): value is number =>
     typeof value === "number" && Number.isFinite(value);

const isProbability = (value: unknown): value is number =>
     isNumber(value) && value >= 0 && value <= 1;

const isStringArray = (value: unknown): value is string[] =>
     Array.isArray(value) && value.every((item) => typeof item === "string");

const isAiApiResponse = (value: unknown): value is AiApiResponse => {
     if (!isRecord(value) || !isRecord(value.probabilities)) return false;

     const probabilities = value.probabilities;
     const lowRiskProbability = probabilities["Low Risk"];
     const midRiskProbability = probabilities["Mid Risk"];
     const highRiskProbability = probabilities["High Risk"];
     const probabilityValues = [
          lowRiskProbability,
          midRiskProbability,
          highRiskProbability
     ];
     const probabilitiesAreValid = probabilityValues.every(isProbability)
          && Math.abs(
               Number(lowRiskProbability)
               + Number(midRiskProbability)
               + Number(highRiskProbability)
               - 1
          ) <= 0.001;
     const validFactors = Array.isArray(value.topFactors)
          && value.topFactors.every((factor) =>
               isRecord(factor)
               && typeof factor.feature === "string"
               && factor.feature.trim().length > 0
               && factor.feature.length <= 100
               && isNumber(factor.impact)
               && Math.abs(factor.impact) <= 99_999.99999
          )
          && new Set(
               value.topFactors.map((factor) =>
                    isRecord(factor) ? factor.feature : undefined
               )
          ).size === value.topFactors.length;
     const validRecommendations = Array.isArray(value.recommendations)
          && value.recommendations.every((recommendation) =>
               isRecord(recommendation)
               && typeof recommendation.feature === "string"
               && isNumber(recommendation.patientValue)
               && typeof recommendation.condition === "string"
               && isStringArray(recommendation.actions)
               && isStringArray(recommendation.counselling)
          );

     return ["Low Risk", "Mid Risk", "High Risk"].includes(String(value.risk))
          && isProbability(value.confidence)
          && probabilitiesAreValid
          && validFactors
          && validRecommendations
          && typeof value.modelVersion === "string"
          && value.modelVersion.trim().length > 0
          && value.modelVersion.length <= 100;
};

const convertCelsiusToFahrenheit = (temperatureCelsius: number) =>
     (temperatureCelsius * 1.8) + 32;

const getAiRequestTimeout = () => {
     const configuredTimeout = Number(process.env.ai_request_timeout_ms);

     return Number.isFinite(configuredTimeout) && configuredTimeout > 0
          ? configuredTimeout
          : 15_000;
};

const getAiPrediction = async (features: PredictionRequest): Promise<AiApiResponse> => {
     try {
          const response = await fetch(
               `${process.env.ai_origin}/predict`,
               {
                    method: "POST",
                    headers: {
                         "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                         age: features.age,
                         systolicBP: features.systolicBP,
                         diastolicBP: features.diastolicBP,
                         bs: features.bloodSugar,
                         bodyTemp: convertCelsiusToFahrenheit(features.bodyTemp),
                         heartRate: features.heartRate
                    }),
                    signal: AbortSignal.timeout(getAiRequestTimeout())
               }
          );

          if (!response.ok) {
               throw new ClientFacingError({
                    statusCode: 502,
                    code: "PREDICTION_SERVICE_ERROR",
                    message: "The risk prediction service could not complete the prediction. Please try again shortly.",
                    cause: new Error(`Prediction service responded with status ${response.status}`)
               });
          }

          let responseBody: unknown;

          try {
               responseBody = await response.json();
          } catch (error) {
               throw new ClientFacingError({
                    statusCode: 502,
                    code: "PREDICTION_SERVICE_INVALID_RESPONSE",
                    message: "The risk prediction service returned an invalid response. Please try again shortly.",
                    cause: error
               });
          }

          if (!isAiApiResponse(responseBody)) {
               throw new ClientFacingError({
                    statusCode: 502,
                    code: "PREDICTION_SERVICE_INVALID_RESPONSE",
                    message: "The risk prediction service returned an invalid response. Please try again shortly."
               });
          }

          return responseBody;
     } catch (error) {
          if (error instanceof ClientFacingError) throw error;

          throw new ClientFacingError({
               statusCode: 502,
               code: "PREDICTION_SERVICE_UNAVAILABLE",
               message: "The risk prediction service is temporarily unavailable. Please try again shortly.",
               cause: error
          });
     }
};

const ensurePatientExists = async (
     server: FastifyInstance,
     patientId: string
) => {
     const client = await server.pg.connect();

     try {
          if (!await patientExists(client, patientId)) {
               throw new ClientFacingError({
                    statusCode: 404,
                    code: "PATIENT_NOT_FOUND",
                    message: "The selected patient does not exist."
               });
          }
     } finally {
          client.release();
     }
};

const recordPredictionFailure = async (
     server: FastifyInstance,
     predictionRunId: string,
     error: unknown
) => {
     const failureCode = error instanceof ClientFacingError
          ? error.code
          : "PREDICTION_PROCESSING_FAILED";

     await withTransaction(
          server,
          (client) => failPredictionRun(client, predictionRunId, failureCode)
     );
};

const executeStoredPrediction = async (
     server: FastifyInstance,
     features: PredictionRequest,
     options: StoredPredictionOptions
) => {
     const predictionRunId = `pred-run-${uuidv7()}`;
     const predictionResultId = `pred-res-${uuidv7()}`;

     await withTransaction(server, (client) => createPredictionRun(client, {
          id: predictionRunId,
          source: options.source,
          createdByUserId: options.createdByUserId,
          requestId: options.requestId ?? predictionRunId,
          ...features
     }));

     let prediction: AiApiResponse;

     try {
          prediction = await getAiPrediction(features);
     } catch (error) {
          try {
               await recordPredictionFailure(server, predictionRunId, error);
          } catch (auditError) {
               throw new ClientFacingError({
                    statusCode: 500,
                    code: "PREDICTION_AUDIT_FAILURE",
                    message: "The prediction attempt could not be recorded. Please try again.",
                    cause: new AggregateError([error, auditError])
               });
          }

          throw error;
     }

     const assessmentId = options.assessment === undefined
          ? undefined
          : `ass-${uuidv7()}`;

     try {
          await withTransaction(server, async (client) => {
               await createPredictionResult(client, {
                    id: predictionResultId,
                    predictionRunId,
                    prediction
               });
               await createPredictionFactors(
                    client,
                    predictionResultId,
                    prediction.topFactors.map((factor) => ({
                         id: `pred-fac-${uuidv7()}`,
                         feature: factor.feature,
                         impact: factor.impact
                    }))
               );

               if (options.assessment !== undefined && assessmentId !== undefined) {
                    await createAssessment(client, {
                         id: assessmentId,
                         patientId: options.assessment.patientId,
                         predictionRunId,
                         createdByUserId: options.assessment.createdByUserId,
                         ...options.assessment.details
                    });
               }

               await completePredictionRun(client, predictionRunId);
          });
     } catch (error) {
          try {
               await recordPredictionFailure(server, predictionRunId, error);
          } catch {
               // The original persistence error is more useful to the global error handler.
          }

          throw error;
     }

     return {
          predictionRunId,
          predictionResultId,
          ...(assessmentId === undefined ? {} : { assessmentId }),
          prediction
     };
};

const processPrediction = async (
     server: FastifyInstance,
     features: PredictionRequest,
     requestId?: string
) => executeStoredPrediction(server, features, {
     source: "standalone",
     createdByUserId: null,
     ...(requestId === undefined ? {} : { requestId })
});

const processPatientAssessment = async (
     server: FastifyInstance,
     patientId: string,
     assessmentRequest: PatientAssessmentRequest,
     createdByUserId: string,
     requestId?: string
) => {
     await ensurePatientExists(server, patientId);

     const {
          gestationalAge,
          firstPregnancy,
          previousComplications,
          ...features
     } = assessmentRequest;
     const result = await executeStoredPrediction(server, features, {
          source: "patient_assessment",
          createdByUserId,
          ...(requestId === undefined ? {} : { requestId }),
          assessment: {
               patientId,
               createdByUserId,
               details: {
                    gestationalAge,
                    firstPregnancy,
                    previousComplications
               }
          }
     });

     return {
          ...result,
          patientId
     };
};

const createPatientAndProcessAssessment = async (
     server: FastifyInstance,
     request: CreatePatientAssessmentRequest,
     createdByUserId: string,
     requestId?: string
) => {
     const {
          firstname,
          middlename,
          lastname,
          dob,
          email,
          phone,
          gestationalAge,
          firstPregnancy,
          previousComplications,
          ...features
     } = request;
     const patient = preparePatientForCreation({
          firstName: firstname,
          middleName: middlename,
          lastName: lastname,
          dob,
          email,
          phone
     });
     const prediction = await getAiPrediction(features);
     const predictionRunId = `pred-run-${uuidv7()}`;
     const predictionResultId = `pred-res-${uuidv7()}`;
     const assessmentId = `ass-${uuidv7()}`;

     await withTransaction(server, async (client) => {
          await createPatient(client, patient);
          await createPredictionRun(client, {
               id: predictionRunId,
               source: "patient_assessment",
               createdByUserId,
               requestId: requestId ?? predictionRunId,
               ...features
          });
          await createPredictionResult(client, {
               id: predictionResultId,
               predictionRunId,
               prediction
          });
          await createPredictionFactors(
               client,
               predictionResultId,
               prediction.topFactors.map((factor) => ({
                    id: `pred-fac-${uuidv7()}`,
                    feature: factor.feature,
                    impact: factor.impact
               }))
          );
          await createAssessment(client, {
               id: assessmentId,
               patientId: patient.id,
               predictionRunId,
               createdByUserId,
               gestationalAge,
               firstPregnancy,
               previousComplications
          });
          await completePredictionRun(client, predictionRunId);
     });

     return {
          patientId: patient.id,
          assessmentId,
          predictionRunId,
          predictionResultId,
          prediction
     };
};

export {
     createPatientAndProcessAssessment,
     processPatientAssessment,
     processPrediction
};
