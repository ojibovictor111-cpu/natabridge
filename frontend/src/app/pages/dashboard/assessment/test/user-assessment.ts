import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { AssessmentTest } from '../../../../components/assessment/test/assessment-test';
import { AuthService } from '../../../../services/auth/auth-service';
import { PatientService } from '../../../../services/patient/patient-service';

@Component({
  selector: 'nata-user-assessment',
  imports: [AssessmentTest, NgIcon, RouterLink],
  templateUrl: './user-assessment.html',
  styleUrl: './user-assessment.css',
  viewProviders: [provideIcons({ lucideArrowLeft })],
})
export class UserAssessment {
  private readonly authService = inject(AuthService);
  private readonly patientService = inject(PatientService);

  readonly userAuthenticated = this.authService.isUserAuthenticated;
  readonly patientId = input<string | null>(null);
  readonly patient = computed(() => {
    const patient = this.patientService.patient();

    return patient?.id === this.patientId() ? patient : null;
  });
  readonly hasPreviousAssessment = computed(() => Boolean(this.patient()?.lastAssessment));

  constructor() {
    effect(() => {
      const patientId = this.patientId();

      if (patientId) {
        untracked(() => this.patientService.getPatient(patientId));
      }
    });
  }
}
