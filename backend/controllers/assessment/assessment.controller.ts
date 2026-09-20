import type { FastifyReply, FastifyRequest } from "fastify";
import type {
    CreatePatientAssessmentRequest,
    PatientAssessmentParams,
    PatientAssessmentRequest
} from "../../models/assessment/dto/assessment.dto";
import {
    createPatientAndProcessAssessment,
    processPatientAssessment
} from "../../services/assessment/assessment.service";
import { requireAuthenticatedUserId } from "../../utils/auth";
import { requireInstitutionId } from "../../utils/permissions";

const postPatientAssessment = async (
    request: FastifyRequest<{
        Body: PatientAssessmentRequest;
        Params: PatientAssessmentParams;
    }>,
    reply: FastifyReply
) => {
    const userId = requireAuthenticatedUserId(request);

    const result = await processPatientAssessment(
        request.server,
        request.params.patientId,
        request.body,
        userId,
        requireInstitutionId(request),
        request.id
    );

    return reply.code(201).send({
        data: result
    });
};

const postNewPatientAssessment = async (
    request: FastifyRequest<{
        Body: CreatePatientAssessmentRequest;
    }>,
    reply: FastifyReply
) => {
    const userId = requireAuthenticatedUserId(request);
    const result = await createPatientAndProcessAssessment(
        request.server,
        request.body,
        userId,
        requireInstitutionId(request),
        request.id
    );

    return reply.code(201).send({
        data: result
    });
};

export {
    postNewPatientAssessment,
    postPatientAssessment
};
