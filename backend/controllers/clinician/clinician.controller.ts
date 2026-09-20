import type { FastifyReply, FastifyRequest } from "fastify";
import type { ClinicianAssessmentParams } from "../../models/assessment/dto/assessment.dto";
import { fetchAssessmentsByClinician } from "../../services/assessment/assessment.service";
import { requireAuthenticatedUserId } from "../../utils/auth";
import { ClientFacingError } from "../../errors/api-error";
import { requireInstitutionId } from "../../utils/permissions";

const getClinicianAssessments = async (
    request: FastifyRequest<{ Params: ClinicianAssessmentParams }>,
    reply: FastifyReply
) => {
    if (request.params.clinicianId !== requireAuthenticatedUserId(request)) {
        throw new ClientFacingError({
            statusCode: 403,
            code: "FORBIDDEN",
            message: "You cannot view another clinician's assessments."
        });
    }

    const assessments = await fetchAssessmentsByClinician(
        request.server,
        request.params.clinicianId,
        requireInstitutionId(request)
    );

    return reply.code(200).send({
        data: assessments
    });
};

export {
    getClinicianAssessments
};
