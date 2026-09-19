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
    this.loading.set(true);

    this.http
      .get<ApiResponse<DashboardResponse>>(`${environment.api}/dashboard`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (resp) => {
          this.dashboardDetails.set(resp.data);

          this.assessmentDetails.set(resp.data.summary);
        },
        error: (err) => this.errorMessage.set(err),
      });
  }

  getClinicianAssessments() {
    const clinicianId = this.authService.clinicianId();
    if (!clinicianId) {
      this.clinicianAssessments.set(null);
      return;
    }

    this.http
      .get<ApiResponse<ClinicianAssessmentApi[]>>(
        `${environment.api}/clinicians/${encodeURIComponent(clinicianId)}/assessments`,
      )
      .subscribe({
        next: (response) => this.clinicianAssessments.set(response.data ?? []),
        error: () => this.clinicianAssessments.set(null),
      });
  }
}
