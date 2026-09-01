import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import {
  AssessmentFormData,
  PatientAssessmentInput,
  PredictionInput,
} from '../../models/assessment/Assessment.api';
import { Environment as environment } from '../../environment/environment';
import { finalize, Observable } from 'rxjs';
import { ApiResponse } from '../../models/api/ApiResponse';
import { AssessmentResultApi } from '../../models/assessment/Assessment-result.api';
import { UtilService } from '../util/util-service';
import { Router } from '@angular/router';

@Service()
export class AssessmentService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private utilService = inject(UtilService);

  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly result = signal<AssessmentResultApi | null>(
    this.utilService.getStoredData<AssessmentResultApi>('assessment_result'),
  );

  readonly userInput = signal<AssessmentFormData | null>(
    this.utilService.getStoredData<AssessmentFormData>('assessment_input'),
  );

  submitPublicPrediction(formData: AssessmentFormData) {
    const predictionInput = this.toPredictionInput(formData);
    this.submit(
      this.http.post<ApiResponse<AssessmentResultApi>>(
        `${environment.api}/predictions`,
        predictionInput,
        { withCredentials: true },
      ),
      formData,
    );
  }

  submitPatientAssessment(patientId: string, formData: AssessmentFormData) {
    const assessmentInput = this.toPatientAssessmentInput(formData);
    this.submit(
      this.http.post<ApiResponse<AssessmentResultApi>>(
        `${environment.api}/patients/${encodeURIComponent(patientId)}/assessments`,
        assessmentInput,
        { withCredentials: true },
      ),
      formData,
    );
  }

  createPatientAndSubmitAssessment(formData: AssessmentFormData) {
    this.submit(
      this.http.post<ApiResponse<AssessmentResultApi>>(
        `${environment.api}/patients/assessments`,
        formData,
        {
          withCredentials: true,
        },
      ),
      formData,
    );
  }

  private submit(
    request: Observable<ApiResponse<AssessmentResultApi>>,
    formData: AssessmentFormData,
  ) {
    this.errorMessage.set(null);
    this.utilService.showLoader();

    this.userInput.set(formData);
    localStorage.setItem('assessment_input', JSON.stringify(formData));

    request
      .pipe(finalize(() => this.utilService.hideLoader()))
      .subscribe({
        next: (resp) => {
          this.result.set(resp.data);

          localStorage.setItem('assessment_result', JSON.stringify(resp.data));

          this.router.navigateByUrl('/assessment/result');
        },

        error: (err) => {
          this.errorMessage.set(err?.error?.message ?? 'Assessment failed');
        },
      });
  }

  private toPredictionInput(data: AssessmentFormData): PredictionInput {
    const { age, systolicBP, diastolicBP, bloodSugar, bodyTemp, heartRate } = data;
    return { age, systolicBP, diastolicBP, bloodSugar, bodyTemp, heartRate };
  }

  private toPatientAssessmentInput(data: AssessmentFormData): PatientAssessmentInput {
    const { gestationalAge, firstPregnancy, previousComplications } = data;
    return {
      ...this.toPredictionInput(data),
      gestationalAge,
      firstPregnancy,
      previousComplications,
    };
  }

  clearAssessmentStorage() {
    localStorage.removeItem('assessment_result');
    localStorage.removeItem('assessment_input');

    this.result.set(null);
    this.userInput.set(null);
  }
}
