import type { FastifyReply, FastifyRequest } from "fastify";
import type {
    CreatePatientAssessmentRequest,
    AssessmentParams,
    PatientAssessmentParams,
    PatientAssessmentRequest
} from "../../models/assessment/dto/assessment.dto";
import {
    createPatientAndProcessAssessment,
    fetchAssessmentById,
    fetchAssessments,
    processPatientAssessment
} from "../../services/assessment/assessment.service";
import { requireAuthenticatedUserId } from "../../utils/auth";
import { requireInstitutionId } from "../../utils/permissions";

const getAssessments = async (request: FastifyRequest, reply: FastifyReply) => {
    const assessments = await fetchAssessments(
        request.server,
        requireInstitutionId(request)
    );
    return reply.code(200).send({ data: assessments });
};

const getAssessment = async (
    request: FastifyRequest<{ Params: AssessmentParams }>,
    reply: FastifyReply
) => {
    const assessment = await fetchAssessmentById(
        request.server,
        request.params.assessmentId,
        requireInstitutionId(request)
    );
    return reply.code(200).send({ data: assessment });
};

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
        requireInstitutionId(request)
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
        requireInstitutionId(request)
    );

    return reply.code(201).send({
        data: result
    });
};

export {
    getAssessment,
    getAssessments,
    postNewPatientAssessment,
    postPatientAssessment
};
