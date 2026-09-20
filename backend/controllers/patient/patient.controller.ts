import type { FastifyReply, FastifyRequest } from "fastify";
import {
     fetchPatientById,
     fetchPatientsWithLatestAssessment,
     registerPatient
} from "../../services/patient/patient.service";
import type {
     CreatePatientRequest,
     PatientParams
} from "../../models/patient/dto/patient.dto";
import { requireAuthenticatedUserId } from "../../utils/auth";
import { requireInstitutionId } from "../../utils/permissions";

const postPatient = async (
     request: FastifyRequest<{
          Body: CreatePatientRequest
     }>,
     reply: FastifyReply
) => {
     const userId = requireAuthenticatedUserId(request);
     const patient = await registerPatient(request.server, request.body, requireInstitutionId(request), userId);

     return reply.code(201).send({
          data: patient
     });
};

const getPatients = async (
     request: FastifyRequest,
     reply: FastifyReply
) => {
     requireAuthenticatedUserId(request);

     const patients = await fetchPatientsWithLatestAssessment(request.server, requireInstitutionId(request));

     return reply.status(200).send({
          data: patients
     });
};

const getPatient = async (
     request: FastifyRequest<{ Params: PatientParams }>,
     reply: FastifyReply
) => {
     requireAuthenticatedUserId(request);

     const patient = await fetchPatientById(
          request.server,
          request.params.patientId,
          requireInstitutionId(request)
     );

     return reply.status(200).send({
          data: patient
     });
};

export {
     getPatient,
     postPatient,
     getPatients
};
