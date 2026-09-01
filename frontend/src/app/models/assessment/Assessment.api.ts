interface PredictionInput {
  age: number;
  systolicBP: number;
  diastolicBP: number;
  bloodSugar: number;
  bodyTemp: number;
  heartRate: number;
}

interface PatientAssessmentInput extends PredictionInput {
  gestationalAge: number | null;
  firstPregnancy: boolean | null;
  previousComplications: string | null;
}

interface AssessmentFormData extends PatientAssessmentInput {
  dob: string | null;
  email: string | null;
  firstname: string | null;
  lastname: string | null;
  middlename: string | null;
  phone: string | null;
}

export type {
  AssessmentFormData,
  PatientAssessmentInput,
  PredictionInput,
};
