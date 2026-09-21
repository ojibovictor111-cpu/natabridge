interface PatientRepoInput {
     id: string;
     firstName: string;
     middleName: string | null;
     lastName: string;
     dob: string | Date;
     email: string | null;
     phone: string | null;
}

interface PatientSummaryRow {
     id: string;
     name: string;
     age: string | number | null;
     gestationalAge: string | number | null;
     firstPregnancy: boolean | null;
     lastAssessment: string | Date | null;
     currentRiskLevel: string | null;
}

export type { PatientRepoInput, PatientSummaryRow };
