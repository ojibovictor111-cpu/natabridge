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

export async function assessmentRoutes(fastify: FastifyInstance) {
    fastify.post(
        "/assessments",
        {
            schema: {
                body: createPatientAssessmentRequestSchema
            }
        },
        postNewPatientAssessment
    );

    fastify.post(
        "/:patientId/assessments",
        {
            schema: {
                body: patientAssessmentRequestSchema,
                params: patientAssessmentParamsSchema
            }
        },
        postPatientAssessment
    );
}
