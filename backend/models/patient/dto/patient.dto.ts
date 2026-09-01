import { Type } from "@fastify/type-provider-typebox";
import type { Static } from "@fastify/type-provider-typebox";

const createPatientRequestSchema = Type.Object(
	{
		firstName: Type.String({
			minLength: 1,
			maxLength: 100,
			pattern: "\\S",
		}),
		middleName: Type.Optional(
			Type.Union([
				Type.Null(),
				Type.String({ minLength: 1, maxLength: 100, pattern: "\\S" }),
			]),
		),
		lastName: Type.String({ minLength: 1, maxLength: 100, pattern: "\\S" }),
		dob: Type.String({ format: "date" }),
		email: Type.Optional(
			Type.Union([
				Type.Null(),
				Type.String({ format: "email", maxLength: 255 }),
			]),
		),
		phone: Type.Optional(
			Type.Union([
				Type.Null(),
				Type.String({ minLength: 1, maxLength: 30, pattern: "\\S" }),
			]),
		),
		gestationalAge: Type.Optional(
			Type.Union([Type.Null(), Type.Number({ minimum: 1, maximum: 45 })]),
		),
		firstPregnancy: Type.Optional(
			Type.Union([Type.Null(), Type.Boolean()]),
		),
		previousComplications: Type.Optional(
			Type.Union([Type.Null(), Type.String({ maxLength: 2000 })]),
		),
	},
	{ additionalProperties: false },
);

const patientParamsSchema = Type.Object(
	{
		patientId: Type.String({ minLength: 1, maxLength: 50 }),
	},
	{ additionalProperties: false },
);

type CreatePatientRequest = Static<typeof createPatientRequestSchema>;
type PatientParams = Static<typeof patientParamsSchema>;

export { createPatientRequestSchema, patientParamsSchema };

export type { CreatePatientRequest, PatientParams };
