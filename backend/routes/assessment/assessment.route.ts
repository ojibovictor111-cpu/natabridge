import type { FastifyInstance } from "fastify";
import {
    getAssessment,
    getAssessments,
    postNewPatientAssessment,
    postPatientAssessment
} from "../../controllers/assessment/assessment.controller";
import {
    assessmentParamsSchema,
    createPatientAssessmentRequestSchema,
    patientAssessmentParamsSchema,
    patientAssessmentRequestSchema
} from "../../models/assessment/dto/assessment.dto";
import type { AssessmentParams, CreatePatientAssessmentRequest, PatientAssessmentParams, PatientAssessmentRequest } from "../../models/assessment/dto/assessment.dto";

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

export async function assessmentReadRoutes(fastify: FastifyInstance) {
    fastify.get(
        "",
        { preHandler: fastify.requirePermissions(["clinical.assessments.read"]) },
        getAssessments
    );
    fastify.get<{ Params: AssessmentParams }>(
        "/:assessmentId",
        {
            preHandler: fastify.requirePermissions(["clinical.assessments.read"]),
            schema: { params: assessmentParamsSchema }
        },
        getAssessment
    );
}
