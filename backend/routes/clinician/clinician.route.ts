import type { FastifyInstance } from "fastify";
import { getClinicianAssessments } from "../../controllers/clinician/clinician.controller";
import { clinicianAssessmentParamsSchema } from "../../models/assessment/dto/assessment.dto";
import type { ClinicianAssessmentParams } from "../../models/assessment/dto/assessment.dto";

export async function clinicianRoutes(fastify: FastifyInstance) {
    fastify.get<{ Params: ClinicianAssessmentParams }>(
        "/:clinicianId/assessments",
        {
            preHandler: fastify.requirePermissions(["clinical.assessments.read"]),
            schema: {
                params: clinicianAssessmentParamsSchema
            }
        },
        getClinicianAssessments
    );
}
