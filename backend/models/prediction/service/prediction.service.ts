import type { PatientAssessmentRequest } from "../../assessment/dto/assessment.dto";
import type { PredictionRunSource } from "../prediction.model";

type PatientAssessmentContext = {
	patientId: string;
	createdByUserId: string;
	details: Pick<
		PatientAssessmentRequest,
		"gestationalAge" | "firstPregnancy" | "previousComplications"
	>;
};

type StoredPredictionOptions = {
	source: PredictionRunSource;
	createdByUserId: string | null;
	assessment?: PatientAssessmentContext;
};

export type { PatientAssessmentContext, StoredPredictionOptions };
