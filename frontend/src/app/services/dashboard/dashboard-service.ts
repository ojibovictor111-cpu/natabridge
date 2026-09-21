import { HttpClient } from '@angular/common/http';
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

  readonly dashboardDetails = signal<DashboardResponse | null>(null);
  readonly clinicianAssessments = signal<ClinicianAssessmentApi[] | null>(null);
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

  getClinicianAssessments() {
    const clinicianId = this.authService.clinicianId();
    this.clinicianAssessments.set(null);
    if (!clinicianId) {
      return;
    }

    this.http
      .get<ApiResponse<ClinicianAssessmentApi[]>>(
        `${environment.api}/clinicians/${encodeURIComponent(clinicianId)}/assessments`,
      )
      .subscribe({
        next: (response) => {
          if (this.authService.clinicianId() === clinicianId) {
            this.clinicianAssessments.set(response.data ?? []);
          }
        },
        error: () => {
          if (this.authService.clinicianId() === clinicianId) this.clinicianAssessments.set(null);
        },
      });
  }
}
