import type { FastifyInstance } from "fastify";
import { CreatePatientRequest } from "../../models/patient/dto/patient.dto";
import {
     createPatient,
     getPatientById,
     getPatientsWithLatestAssessment
} from "../../repositories/patient/patient.repo";
import type { PatientSummaryRow } from "../../repositories/patient/patient.repo";
import type { PatientRepoInput } from "../../models/patient/repo/patients.repo";
import { uuidv7 } from "uuidv7";
import { withTransaction } from "../../db/transaction";
import { ClientFacingError } from "../../errors/api-error";

const normalizeOptionalString = (value: string | null | undefined) => {
     const normalizedValue = value?.trim();

     return normalizedValue === undefined || normalizedValue.length === 0
          ? null
          : normalizedValue;
};

const toPatientSummary = (patient: PatientSummaryRow) => ({
     ...patient,
     age: patient.age === null ? null : Number(patient.age),
     gestationalAge: patient.gestationalAge === null
          ? null
          : Number(patient.gestationalAge)
});

const preparePatientForCreation = (
     patient: CreatePatientRequest
): PatientRepoInput => {
     const email = normalizeOptionalString(patient.email)?.toLowerCase() ?? null;
     const phone = normalizeOptionalString(patient.phone);

     if (email === null && phone === null) {
          throw new ClientFacingError({
               statusCode: 400,
               code: "PATIENT_CONTACT_REQUIRED",
               message: "Provide at least one patient contact method: email or phone."
          });
     }

     return {
          id: `pat-${uuidv7()}`,
          firstName: patient.firstName.trim(),
          middleName: normalizeOptionalString(patient.middleName),
          lastName: patient.lastName.trim(),
          dob: patient.dob,
          email,
          phone
     };
};

const registerPatient = async (
     server: FastifyInstance,
     patient: CreatePatientRequest
) => {
     const patientToCreate = preparePatientForCreation(patient);
     const createdPatient = await withTransaction(
          server,
          (client) => createPatient(client, patientToCreate)
     );

     return {
          id: createdPatient.id,
          firstName: createdPatient.firstname,
          middleName: createdPatient.middlename,
          lastName: createdPatient.lastname,
          // Return the already validated calendar date instead of pg's local Date
          // object, which can serialize as the previous UTC day in positive zones.
          dob: patient.dob,
          email: createdPatient.email,
          phone: createdPatient.phone,
          createdAt: createdPatient.created_at
     };
};

const fetchPatientsWithLatestAssessment = async (server: FastifyInstance) => {
     const client = await server.pg.connect();

     try {
          const patients = await getPatientsWithLatestAssessment(client);

          return patients.map(toPatientSummary);
     } finally {
          client.release();
     }
};

const fetchPatientById = async (
     server: FastifyInstance,
     patientId: string
) => {
     const client = await server.pg.connect();

     try {
          const patient = await getPatientById(client, patientId);

          if (patient === undefined) {
               throw new ClientFacingError({
                    statusCode: 404,
                    code: "PATIENT_NOT_FOUND",
                    message: "The selected patient does not exist."
               });
          }

          return toPatientSummary(patient);
     } finally {
          client.release();
     }
};

export {
     fetchPatientById,
     preparePatientForCreation,
     registerPatient,
     fetchPatientsWithLatestAssessment
};
