interface PatientApi {
  id: string;
  name: string;
  age: number | null;
  gestationalAge: number | null;
  lastAssessment: string | Date | null;
  currentRiskLevel: string | null;
}

interface CreatePatientInput {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dob: string;
  email?: string | null;
  phone?: string | null;
  gestationalAge?: number | null;
  firstPregnancy?: boolean | null;
  previousComplications?: string | null;
}

interface CreatedPatientApi {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dob: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

export type { CreatePatientInput, CreatedPatientApi, PatientApi };
