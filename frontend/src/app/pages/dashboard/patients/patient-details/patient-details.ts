import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideActivity,
  lucideArrowLeft,
  lucideCalendarDays,
  lucideClipboardCheck,
  lucideClock3,
  lucideFileText,
  lucidePrinter,
  lucideRefreshCw,
  lucideUserRound,
} from '@ng-icons/lucide';
import { ACCESS } from '../../../../core/auth/access';
import { AuthService } from '../../../../services/auth/auth-service';
import { PatientService } from '../../../../services/patient/patient-service';

type RiskTone = 'high' | 'mid' | 'low' | 'none';

@Component({
  selector: 'nata-patient-details',
  imports: [
    NgIcon,
    RouterLink,
    ...HlmAvatarImports,
    ...HlmButtonImports,
    ...HlmSkeletonImports,
  ],
  templateUrl: './patient-details.html',
  styleUrl: './patient-details.css',
  viewProviders: [
    provideIcons({
      lucideActivity,
      lucideArrowLeft,
      lucideCalendarDays,
      lucideClipboardCheck,
      lucideClock3,
      lucideFileText,
      lucidePrinter,
      lucideRefreshCw,
      lucideUserRound,
    }),
  ],
})
export class PatientDetails {
  private readonly patientService = inject(PatientService);
  private readonly authService = inject(AuthService);

  readonly id = input<string | null>(null);
  readonly errorMessage = this.patientService.errorMessage;
  readonly patient = computed(() => {
    const patient = this.patientService.patient();

    return patient?.id === this.id() ? patient : null;
  });
  readonly loading = computed(() => this.patientService.loading() && !this.patient());
  readonly canCreateAssessment = computed(() =>
    this.authService.hasAllPermissions(ACCESS.clinical.assessments.createForExistingPatient),
  );
  readonly canExportRecords = computed(() =>
    this.authService.hasAllPermissions(ACCESS.clinical.records.export),
  );

  constructor() {
    effect(() => {
      const patientId = this.id();

      if (patientId) {
        untracked(() => this.patientService.getPatient(patientId));
      }
    });
  }

  retry() {
    const patientId = this.id();

    if (patientId) this.patientService.getPatient(patientId);
  }

  printSummary() {
    window.print();
  }

  patientInitials(name: string) {
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

    return initials || 'PT';
  }

  riskTone(risk: string | null): RiskTone {
    const normalizedRisk = risk?.toLowerCase() ?? '';

    if (normalizedRisk.includes('high')) return 'high';
    if (normalizedRisk.includes('mid') || normalizedRisk.includes('medium')) return 'mid';
    if (normalizedRisk.includes('low')) return 'low';

    return 'none';
  }

  riskLabel(risk: string | null) {
    switch (this.riskTone(risk)) {
      case 'high':
        return 'High risk';
      case 'mid':
        return 'Mid risk';
      case 'low':
        return 'Low risk';
      default:
        return 'Not assessed';
    }
  }

  riskMessage(risk: string | null) {
    switch (this.riskTone(risk)) {
      case 'high':
        return 'The latest assessment was classified as high risk. Review the source assessment and confirm the recorded findings.';
      case 'mid':
        return 'The latest assessment was classified as mid risk. Review the source assessment for the recorded findings.';
      case 'low':
        return 'The latest assessment was classified as low risk. Review the source assessment for the recorded findings.';
      default:
        return 'No maternal risk assessment is available for this patient yet.';
    }
  }

  formatAssessmentDate(value: string | Date | null) {
    if (!value) return 'No assessment recorded';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  dateTimeValue(value: string | Date | null) {
    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
}
