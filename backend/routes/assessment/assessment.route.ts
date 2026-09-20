import type { FastifyInstance } from "fastify";
import {
    postNewPatientAssessment,
    postPatientAssessment
} from "../../controllers/assessment/assessment.controller";
import {
    createPatientAssessmentRequestSchema,
    patientAssessmentParamsSchema,
    patientAssessmentRequestSchema
} from "../../models/assessment/dto/assessment.dto";
import type { CreatePatientAssessmentRequest, PatientAssessmentParams, PatientAssessmentRequest } from "../../models/assessment/dto/assessment.dto";

export async function assessmentRoutes(fastify: FastifyInstance) {
    fastify.post<{ Body: CreatePatientAssessmentRequest }>(
        "/assessments",
        {
            preHandler: fastify.requirePermissions([
                "clinical.beneficiaries.create",
                "clinical.assessments.create",
                "clinical.predictions.run"
            ]),
            schema: {
                body: createPatientAssessmentRequestSchema
            }
        },
        postNewPatientAssessment
    );

    fastify.post<{ Body: PatientAssessmentRequest; Params: PatientAssessmentParams }>(
        "/:patientId/assessments",
        {
            preHandler: fastify.requirePermissions([
                "clinical.beneficiaries.read",
                "clinical.assessments.create",
                "clinical.predictions.run"
            ]),
            schema: {
                body: patientAssessmentRequestSchema,
                params: patientAssessmentParamsSchema
            }
        },
        postPatientAssessment
    );
}
