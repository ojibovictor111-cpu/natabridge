import { Type } from "@fastify/type-provider-typebox";
import type { Static } from "@fastify/type-provider-typebox";
import { predictionRequestSchema } from "../../prediction/dto/prediction.dto";

const patientAssessmentRequestSchema = Type.Object(
	{
		...predictionRequestSchema.properties,
		gestationalAge: Type.Union([
			Type.Null(),
			Type.Number({ minimum: 1, maximum: 45 }),
		]),
		firstPregnancy: Type.Union([Type.Null(), Type.Boolean()]),
		previousComplications: Type.Union([
			Type.Null(),
			Type.String({ maxLength: 2000 }),
		]),
	},
	{ additionalProperties: false },
);

const patientAssessmentParamsSchema = Type.Object(
	{
		patientId: Type.String({ minLength: 1, maxLength: 50 }),
	},
	{ additionalProperties: false },
);

const clinicianAssessmentParamsSchema = Type.Object(
	{
		clinicianId: Type.String({ minLength: 1, maxLength: 50 }),
	},
	{ additionalProperties: false },
);

const createPatientAssessmentRequestSchema = Type.Object(
	{
		...patientAssessmentRequestSchema.properties,
		firstname: Type.String({
			minLength: 1,
			maxLength: 100,
			pattern: "\\S",
		}),
		middlename: Type.Union([
			Type.Null(),
			Type.String({ minLength: 1, maxLength: 100, pattern: "\\S" }),
		]),
		lastname: Type.String({ minLength: 1, maxLength: 100, pattern: "\\S" }),
		dob: Type.String({ format: "date" }),
		email: Type.Union([
			Type.Null(),
			Type.String({ format: "email", maxLength: 255 }),
		]),
		phone: Type.Union([
			Type.Null(),
			Type.String({ minLength: 1, maxLength: 30, pattern: "\\S" }),
		]),
	},
	{ additionalProperties: false },
);

type PatientAssessmentRequest = Static<typeof patientAssessmentRequestSchema>;
type PatientAssessmentParams = Static<typeof patientAssessmentParamsSchema>;
type CreatePatientAssessmentRequest = Static<
	typeof createPatientAssessmentRequestSchema
>;
type ClinicianAssessmentParams = Static<typeof clinicianAssessmentParamsSchema>;

export {
	clinicianAssessmentParamsSchema,
	createPatientAssessmentRequestSchema,
	patientAssessmentParamsSchema,
	patientAssessmentRequestSchema,
};

export type {
	ClinicianAssessmentParams,
	CreatePatientAssessmentRequest,
	PatientAssessmentParams,
	PatientAssessmentRequest,
};
