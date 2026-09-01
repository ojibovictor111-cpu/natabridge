import type { FastifyReply, FastifyRequest } from "fastify";
import type { ClinicianAssessmentParams } from "../../models/assessment/dto/assessment.dto";
import { fetchAssessmentsByClinician } from "../../services/assessment/assessment.service";

const getClinicianAssessments = async (
    request: FastifyRequest<{ Params: ClinicianAssessmentParams }>,
    reply: FastifyReply
) => {
    const assessments = await fetchAssessmentsByClinician(
        request.server,
        request.params.clinicianId
    );

    return reply.code(200).send({
        data: assessments
    });
};

export {
    getClinicianAssessments
};
