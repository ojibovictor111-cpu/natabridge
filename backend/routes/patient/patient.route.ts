import type { FastifyInstance } from "fastify";
import {
    getPatient,
    getPatients,
    postPatient
} from "../../controllers/patient/patient.controller";
import {
    createPatientRequestSchema,
    patientParamsSchema
} from "../../models/patient/dto/patient.dto";
import type { CreatePatientRequest, PatientParams } from "../../models/patient/dto/patient.dto";

export async function patientRoutes(fastify: FastifyInstance) {
    fastify.post<{ Body: CreatePatientRequest }>(
        "",
        {
            preHandler: fastify.requirePermissions(["clinical.beneficiaries.create"]),
            schema: {
                body: createPatientRequestSchema
            }
        },
        postPatient
    );
    fastify.get("", { preHandler: fastify.requirePermissions(["clinical.beneficiaries.read"]) }, getPatients);
    fastify.get<{ Params: PatientParams }>(
        "/:patientId",
        {
            preHandler: fastify.requirePermissions(["clinical.beneficiaries.read"]),
            schema: {
                params: patientParamsSchema
            }
        },
        getPatient
    );
}
