import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { DashboardService } from '../../../../services/dashboard/dashboard-service';

type RiskTone = 'high' | 'mid' | 'low' | 'none';

@Component({
  selector: 'nata-assessment-details',
  imports: [DatePipe, RouterLink, ...HlmButtonImports, ...HlmSkeletonImports],
  templateUrl: './assessment-details.html',
  styleUrl: './assessment-details.css',
})
export class AssessmentDetails {
  private readonly dashboardService = inject(DashboardService);

  readonly assessmentId = input<string | null>(null);
  readonly assessment = computed(() => {
    const assessment = this.dashboardService.assessment();

    return assessment?.id === this.assessmentId() ? assessment : null;
  });
  readonly loading = this.dashboardService.assessmentLoading;
  readonly errorMessage = this.dashboardService.assessmentErrorMessage;

  constructor() {
    effect(() => {
      const assessmentId = this.assessmentId();

      if (assessmentId) {
        untracked(() => this.dashboardService.getAssessment(assessmentId));
      }
    });
  }

  retry(): void {
    const assessmentId = this.assessmentId();

    if (assessmentId) this.dashboardService.getAssessment(assessmentId);
  }

  patientName(): string {
    const patient = this.assessment()?.patient;

    return patient
      ? [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')
      : 'Patient';
  }

  riskTone(): RiskTone {
    const risk = this.assessment()?.prediction.risk?.toLowerCase() ?? '';

    if (risk.includes('high')) return 'high';
    if (risk.includes('mid') || risk.includes('medium')) return 'mid';
    if (risk.includes('low')) return 'low';

    return 'none';
  }

  riskLabel(): string {
    switch (this.riskTone()) {
      case 'high':
        return 'High risk';
      case 'mid':
        return 'Mid risk';
      case 'low':
        return 'Low risk';
      default:
        return this.assessment()?.prediction.status || 'Pending';
    }
  }

  percent(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return '—';

    return `${Math.round(value * 100)}%`;
  }

  booleanLabel(value: boolean | null): string {
    if (value === null) return 'Not recorded';

    return value ? 'Yes' : 'No';
  }

  dateTimeValue(value: string): string | null {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
}
