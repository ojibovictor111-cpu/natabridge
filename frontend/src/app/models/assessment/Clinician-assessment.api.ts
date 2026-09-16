interface ClinicianAssessmentApi {
  id: string;
  clinicianId: string;
  assessedAt: string;
  patient: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    dob: string;
    email: string | null;
    phone: string | null;
  };
  clinicalContext: {
    gestationalAge: number | null;
    firstPregnancy: boolean | null;
    previousComplications: string | null;
  };
  measurements: {
    age: number;
    systolicBP: number;
    diastolicBP: number;
    bloodSugar: number;
    bodyTemp: number;
    heartRate: number;
  };
  prediction: {
    runId: string;
    resultId: string | null;
    status: string;
    risk: string | null;
    confidence: number | null;
    probabilities: {
      lowRisk: number | null;
      midRisk: number | null;
      highRisk: number | null;
    };
    modelVersion: string | null;
    response: unknown;
    factors: { feature: string; impact: number }[];
  };
}

export type { ClinicianAssessmentApi };
