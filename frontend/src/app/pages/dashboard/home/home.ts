import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DashboardAssessment } from '../../../models/dashboard/dashboard.api';
import { DashboardService } from '../../../services/dashboard/dashboard-service';

type RiskTone = 'high' | 'mid' | 'low';

interface CriticalAlertView {
  name: string;
  detail: string;
}

interface RecentAssessmentView {
  name: string;
  vitals: string;
  risk: string;
  riskTone: RiskTone;
  assessed: string;
}

@Component({
  selector: 'nata-home',
  imports: [RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly assessmentDetails = this.dashboardService.assessmentDetails;
  readonly dashboardDetails = this.dashboardService.dashboardDetails;

  readonly totalAssessments = computed(() => {
    const details = this.assessmentDetails();
    if (!details) return null;

    return details.high + details.mid + details.low;
  });

  readonly criticalAlerts = computed<CriticalAlertView[]>(() => {
    const assessments = this.dashboardDetails()?.priorityAssessments ?? [];

    return assessments.slice(0, 3).map((assessment) => ({
      name: assessment.name,
      detail: this.alertDetail(assessment),
    }));
  });

  readonly recentAssessments = computed<RecentAssessmentView[]>(() => {
    const assessments = this.dashboardDetails()?.recentAssessments ?? [];

    return assessments.slice(0, 4).map((assessment) => {
      const riskTone = this.riskTone(assessment.currentRiskLevel);

      return {
        name: assessment.name,
        vitals: `${assessment.systolicBP}/${assessment.diastolicBP} · ${assessment.heartRate} bpm`,
        risk: `${riskTone === 'mid' ? 'Mid' : riskTone[0].toUpperCase() + riskTone.slice(1)} risk`,
        riskTone,
        assessed: this.assessedAt(assessment.lastAssessment),
      };
    });
  });

  ngOnInit() {
    void this.dashboardService.getDashboardDetails();
  }

  private riskTone(risk: string): RiskTone {
    const normalizedRisk = risk.toLowerCase();

    if (normalizedRisk.includes('high')) return 'high';
    if (normalizedRisk.includes('mid') || normalizedRisk.includes('medium')) return 'mid';

    return 'low';
  }

  private alertDetail(assessment: DashboardAssessment) {
    if (assessment.systolicBP >= 140 || assessment.diastolicBP >= 90) {
      return `BP ${assessment.systolicBP}/${assessment.diastolicBP} mmHg`;
    }

    if (assessment.bodyTemperatureCelsius >= 38) {
      return `Temperature ${assessment.bodyTemperatureCelsius.toFixed(1)} °C`;
    }

    if (assessment.bloodSugar >= 7.8) {
      return `Blood sugar ${assessment.bloodSugar.toFixed(1)} mmol/L`;
    }

    return `Heart rate ${assessment.heartRate} bpm`;
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
