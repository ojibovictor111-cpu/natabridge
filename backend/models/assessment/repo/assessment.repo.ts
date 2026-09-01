interface AssessmentRepoInput {
     id: string;
     patientId: string;
     predictionRunId: string;
     createdByUserId: string;
     gestationalAge: number | null;
     firstPregnancy: boolean | null;
     previousComplications: string | null;
}

interface ClinicianAssessmentRow {
     assessment_id: string;
     clinician_id: string;
     gestational_age: string | number | null;
     first_pregnancy: boolean | null;
     previous_complications: string | null;
     assessed_at: Date | string;
     patient_id: string;
     patient_firstname: string;
     patient_middlename: string | null;
     patient_lastname: string;
     patient_dob: Date | string;
     patient_email: string | null;
     patient_phone: string | null;
     prediction_run_id: string;
     prediction_status: string;
     age: string | number;
     systolic_bp: string | number;
     diastolic_bp: string | number;
     blood_sugar: string | number;
     body_temperature_celsius: string | number;
     heart_rate: string | number;
     prediction_result_id: string | null;
     prediction: string | null;
     confidence: string | number | null;
     low_risk_probability: string | number | null;
     mid_risk_probability: string | number | null;
     high_risk_probability: string | number | null;
     model_version: string | null;
     response_payload: unknown;
     factors: unknown;
}

export type {
     AssessmentRepoInput,
     ClinicianAssessmentRow
}
