import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ACCESS } from '../../../core/auth/access';
import { ClinicianAssessmentApi } from '../../../models/assessment/Clinician-assessment.api';
import type {
  CriticalAlertView,
  MonthlyAssessmentView,
  RecentAssessmentView,
  RiskTone,
} from '../../../models/dashboard/dashboard.ui';
import { DashboardService } from '../../../services/dashboard/dashboard-service';
import { AuthService } from '../../../services/auth/auth-service';

@Component({
  selector: 'nata-home',
  imports: [RouterModule, ...HlmButtonImports],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);

  readonly currentYear = new Date().getFullYear();
  readonly assessments = this.dashboardService.assessments;
  readonly username = computed(() => this.authService.user()?.email.split('@')[0] || 'there');
  readonly canViewPatients = computed(() =>
    this.authService.hasAllPermissions(ACCESS.clinical.patients.list),
  );
  readonly canViewAssessments = computed(() =>
    this.authService.hasAllPermissions(ACCESS.clinical.assessments.list),
  );
  readonly canCreateAssessment = computed(() =>
    this.authService.hasAllPermissions(ACCESS.clinical.assessments.createWithNewPatient),
  );
  readonly canExportRecords = computed(() =>
    this.authService.hasAllPermissions(ACCESS.clinical.records.export),
  );

  readonly assessmentsToday = computed(() => {
    const assessments = this.assessments();
    if (!assessments) return null;

    const today = new Date().toDateString();
    return assessments.filter((assessment) => {
      const date = new Date(assessment.assessedAt);
      return !Number.isNaN(date.getTime()) && date.toDateString() === today;
    }).length;
  });

  readonly patientsMonitored = computed(() => {
    const assessments = this.assessments();
    if (!assessments) return null;

    return new Set(assessments.map((assessment) => assessment.patient.id)).size;
  });

  readonly highRiskPatients = computed(() => {
    const assessments = this.assessments();
    if (!assessments) return null;

    const latestByPatient = new Map<string, ClinicianAssessmentApi>();
    assessments.forEach((assessment) => {
      if (!latestByPatient.has(assessment.patient.id)) {
        latestByPatient.set(assessment.patient.id, assessment);
      }
    });

    return [...latestByPatient.values()].filter(
      (assessment) => this.riskTone(assessment.prediction.risk) === 'high',
    ).length;
  });

  readonly pendingAssessments = computed(() => {
    const assessments = this.assessments();
    if (!assessments) return null;

    return assessments.filter(
      (assessment) => this.riskTone(assessment.prediction.risk) === 'none',
    ).length;
  });

  readonly criticalAlerts = computed<CriticalAlertView[]>(() => {
    const assessments = this.assessments() ?? [];

    return assessments
      .filter((assessment) => this.riskTone(assessment.prediction.risk) === 'high')
      .slice(0, 3)
      .map((assessment) => ({
        id: assessment.id,
        name: this.patientName(assessment),
        detail: this.alertDetail(assessment),
      }));
  });

  readonly recentAssessments = computed<RecentAssessmentView[]>(() => {
    const assessments = this.assessments() ?? [];

    return assessments.slice(0, 4).map((assessment) => {
      const riskTone = this.riskTone(assessment.prediction.risk);
      const riskLabel = assessment.prediction.risk?.trim();

      return {
        id: assessment.id,
        name: this.patientName(assessment),
        vitals: `${assessment.measurements.systolicBP}/${assessment.measurements.diastolicBP} · ${assessment.measurements.heartRate} bpm`,
        risk: riskLabel
          ? riskTone === 'none'
            ? riskLabel
            : `${riskTone === 'mid' ? 'Mid' : riskTone[0].toUpperCase() + riskTone.slice(1)} risk`
          : 'Pending',
        riskTone,
        assessed: this.assessedAt(assessment.assessedAt),
      };
    });
  });

  readonly monthlyOverview = computed<MonthlyAssessmentView[] | null>(() => {
    const assessments = this.assessments();
    if (!assessments) return null;

    const year = new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
      (label) => ({ label, low: 0, mid: 0, high: 0, total: 0, height: 0 }),
    );

    assessments.forEach((assessment) => {
      const date = new Date(assessment.assessedAt);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return;

      const month = months[date.getMonth()];
      const tone = this.riskTone(assessment.prediction.risk);
      month.total += 1;
      if (tone === 'high') month.high += 1;
      if (tone === 'mid') month.mid += 1;
      if (tone === 'low') month.low += 1;
    });

    const maximum = Math.max(1, ...months.map((month) => month.total));
    return months.map((month) => ({ ...month, height: (month.total / maximum) * 100 }));
  });

  readonly monthlyAverage = computed(() => {
    const months = this.monthlyOverview();
    if (!months) return null;

    const total = months.reduce((sum, month) => sum + month.total, 0);
    return Number((total / 12).toFixed(1));
  });

  ngOnInit() {
    if (this.canViewAssessments()) this.dashboardService.getAssessments();
  }

  private riskTone(risk: string | null): RiskTone {
    const normalizedRisk = risk?.toLowerCase() ?? '';

    if (normalizedRisk.includes('high')) return 'high';
    if (normalizedRisk.includes('mid') || normalizedRisk.includes('medium')) return 'mid';
    if (normalizedRisk.includes('low')) return 'low';

    return 'none';
  }

  private alertDetail(assessment: ClinicianAssessmentApi) {
    const measurements = assessment.measurements;

    if (measurements.systolicBP >= 140 || measurements.diastolicBP >= 90) {
      return `BP ${measurements.systolicBP}/${measurements.diastolicBP} mmHg`;
    }

    if (measurements.bodyTemp >= 38) {
      return `Temperature ${measurements.bodyTemp.toFixed(1)} °C`;
    }

    if (measurements.bloodSugar >= 7.8) {
      return `Blood sugar ${measurements.bloodSugar.toFixed(1)} mmol/L`;
    }

    return `Heart rate ${measurements.heartRate} bpm`;
  }

  private patientName(assessment: ClinicianAssessmentApi) {
    return [assessment.patient.firstName, assessment.patient.middleName, assessment.patient.lastName]
      .filter(Boolean)
      .join(' ');
  }

  private assessedAt(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    const time = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) return `Today, ${time}`;

    const day = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);

    return `${day}, ${time}`;
  }
}
