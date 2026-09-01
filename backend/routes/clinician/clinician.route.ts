import type { FastifyInstance } from "fastify";
import { getClinicianAssessments } from "../../controllers/clinician/clinician.controller";
import { clinicianAssessmentParamsSchema } from "../../models/assessment/dto/assessment.dto";

export async function clinicianRoutes(fastify: FastifyInstance) {
    fastify.get(
        "/:clinicianId/assessments",
        {
            schema: {
                params: clinicianAssessmentParamsSchema
            }
        },
        getClinicianAssessments
    );
}
