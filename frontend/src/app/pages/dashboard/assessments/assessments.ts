import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { ACCESS } from '../../../core/auth/access';
import { ClinicianAssessmentApi } from '../../../models/assessment/Clinician-assessment.api';
import { AuthService } from '../../../services/auth/auth-service';
import { DashboardService } from '../../../services/dashboard/dashboard-service';

type RiskTone = 'high' | 'mid' | 'low' | 'none';

@Component({
  selector: 'nata-assessments',
  imports: [DatePipe, RouterLink, ...HlmButtonImports, ...HlmSkeletonImports],
  templateUrl: './assessments.html',
  styleUrl: './assessments.css',
})
export class Assessments implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);

  readonly assessments = this.dashboardService.assessments;
  readonly loading = this.dashboardService.assessmentsLoading;
  readonly errorMessage = this.dashboardService.assessmentsErrorMessage;
  readonly canCreateAssessment = computed(() =>
    this.authService.hasAllPermissions(ACCESS.clinical.assessments.createWithNewPatient),
  );
  readonly sortedAssessments = computed(() =>
    [...(this.assessments() ?? [])].sort(
      (first, second) => this.timestamp(second.assessedAt) - this.timestamp(first.assessedAt),
    ),
  );
  readonly highRiskCount = computed(
    () =>
      (this.assessments() ?? []).filter(
        (assessment) => this.riskTone(assessment.prediction.risk) === 'high',
      ).length,
  );
  readonly pendingCount = computed(
    () =>
      (this.assessments() ?? []).filter(
        (assessment) => this.riskTone(assessment.prediction.risk) === 'none',
      ).length,
  );

  ngOnInit(): void {
    this.loadAssessments();
  }

  loadAssessments(): void {
    this.dashboardService.getAssessments();
  }

  patientName(assessment: ClinicianAssessmentApi): string {
    return [assessment.patient.firstName, assessment.patient.middleName, assessment.patient.lastName]
      .filter(Boolean)
      .join(' ');
  }

  riskTone(risk: string | null): RiskTone {
    const normalizedRisk = risk?.toLowerCase() ?? '';

    if (normalizedRisk.includes('high')) return 'high';
    if (normalizedRisk.includes('mid') || normalizedRisk.includes('medium')) return 'mid';
    if (normalizedRisk.includes('low')) return 'low';

    return 'none';
  }

  riskLabel(assessment: ClinicianAssessmentApi): string {
    switch (this.riskTone(assessment.prediction.risk)) {
      case 'high':
        return 'High risk';
      case 'mid':
        return 'Mid risk';
      case 'low':
        return 'Low risk';
      default:
        return assessment.prediction.status || 'Pending';
    }
  }

  confidenceLabel(confidence: number | null): string {
    if (confidence === null || !Number.isFinite(confidence)) return '—';

    return `${Math.round(confidence * 100)}%`;
  }

  dateTimeValue(value: string): string | null {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  trackAssessment(_: number, assessment: ClinicianAssessmentApi): string {
    return assessment.id;
  }

  private timestamp(value: string): number {
    const timestamp = new Date(value).getTime();

    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}
