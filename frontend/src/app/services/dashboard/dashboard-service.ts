import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { Environment as environment } from '../../environment/environment';
import { DashboardResponse } from '../../models/dashboard/dashboard.api';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../models/api/ApiResponse';
import { ClinicianAssessmentApi } from '../../models/assessment/Clinician-assessment.api';
import { AuthService } from '../auth/auth-service';

@Service()
export class DashboardService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly assessmentsLoading = signal(false);
  readonly assessmentsErrorMessage = signal<string | null>(null);
  readonly assessmentLoading = signal(false);
  readonly assessmentErrorMessage = signal<string | null>(null);

  readonly dashboardDetails = signal<DashboardResponse | null>(null);
  readonly assessments = signal<ClinicianAssessmentApi[] | null>(null);
  readonly assessment = signal<ClinicianAssessmentApi | null>(null);
  readonly assessmentDetails = signal<{
    high: number;
    mid: number;
    low: number;
  } | null>(null);

  async getDashboardDetails() {
    const clinicianId = this.authService.clinicianId();
    this.dashboardDetails.set(null);
    this.assessmentDetails.set(null);
    this.loading.set(true);

    this.http
      .get<ApiResponse<DashboardResponse>>(`${environment.api}/dashboard`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (resp) => {
          if (this.authService.clinicianId() !== clinicianId) return;
          this.dashboardDetails.set(resp.data);

          this.assessmentDetails.set(resp.data.summary);
        },
        error: (err) => {
          if (this.authService.clinicianId() === clinicianId) this.errorMessage.set(err);
        },
      });
  }

  getAssessments() {
    const institutionId = this.authService.activeInstitutionId();
    this.assessments.set(null);
    this.assessmentsErrorMessage.set(null);
    this.assessmentsLoading.set(true);

    this.http
      .get<ApiResponse<ClinicianAssessmentApi[]>>(`${environment.api}/assessments`)
      .pipe(
        finalize(() => {
          if (this.authService.activeInstitutionId() === institutionId) {
            this.assessmentsLoading.set(false);
          }
        }),
      )
      .subscribe({
        next: (response) => {
          if (this.authService.activeInstitutionId() === institutionId) {
            this.assessments.set(response.data ?? []);
          }
        },
        error: (error: HttpErrorResponse) => {
          if (this.authService.activeInstitutionId() !== institutionId) return;

          this.assessments.set(null);
          this.assessmentsErrorMessage.set(this.getAssessmentErrorMessage(error));
        },
      });
  }

  getAssessment(assessmentId: string) {
    const institutionId = this.authService.activeInstitutionId();
    this.assessment.set(null);
    this.assessmentErrorMessage.set(null);
    this.assessmentLoading.set(true);

    this.http
      .get<ApiResponse<ClinicianAssessmentApi>>(
        `${environment.api}/assessments/${encodeURIComponent(assessmentId)}`,
      )
      .pipe(
        finalize(() => {
          if (this.authService.activeInstitutionId() === institutionId) {
            this.assessmentLoading.set(false);
          }
        }),
      )
      .subscribe({
        next: (response) => {
          if (this.authService.activeInstitutionId() === institutionId) {
            this.assessment.set(response.data);
          }
        },
        error: (error: HttpErrorResponse) => {
          if (this.authService.activeInstitutionId() !== institutionId) return;

          this.assessment.set(null);
          this.assessmentErrorMessage.set(this.getAssessmentErrorMessage(error));
        },
      });
  }

  private getAssessmentErrorMessage(error: HttpErrorResponse): string {
    const apiMessage = error.error?.message;

    if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;

    if (error.status === 0) {
      return 'Unable to reach assessment records. Check your connection and try again.';
    }

    return 'Unable to load assessment records right now. Please try again.';
  }
}
