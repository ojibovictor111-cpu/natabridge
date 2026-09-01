import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideUserPlus } from '@ng-icons/lucide';
import { CreatePatientInput } from '../../../../models/patient/Patient.api';
import { PatientService } from '../../../../services/patient/patient-service';

function patientContactValidator(control: AbstractControl): ValidationErrors | null {
  const email = control.get('email')?.value?.trim();
  const phone = control.get('phone')?.value?.trim();

  return email || phone ? null : { contactRequired: true };
}

@Component({
  selector: 'nata-register-patient',
  imports: [NgIcon, ReactiveFormsModule, RouterLink],
  templateUrl: './register-patient.html',
  styleUrl: './register-patient.css',
  viewProviders: [provideIcons({ lucideArrowLeft, lucideUserPlus })],
})
export class RegisterPatient {
  private readonly patientService = inject(PatientService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly maximumDateOfBirth = new Date().toISOString().slice(0, 10);

  readonly registrationForm = new FormGroup(
    {
      firstName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      middleName: new FormControl<string | null>(null, [Validators.maxLength(100)]),
      lastName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      dob: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      email: new FormControl<string | null>(null, [Validators.email, Validators.maxLength(255)]),
      phone: new FormControl<string | null>(null, [Validators.maxLength(30)]),
      gestationalAge: new FormControl<number | null>(null, [
        Validators.min(1),
        Validators.max(45),
      ]),
      firstPregnancy: new FormControl<boolean | null>(null),
      previousComplications: new FormControl<string | null>(null, [
        Validators.maxLength(2000),
      ]),
    },
    { validators: patientContactValidator },
  );

  submit() {
    if (this.registrationForm.invalid || this.submitting()) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);

    this.patientService
      .registerPatient(this.toRequestPayload())
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ data: patient }) => {
          void this.router.navigate(['/dashboard/patients', patient.id]);
        },
        error: (error) => {
          this.errorMessage.set(
            error?.error?.message ?? 'Unable to register this patient. Please try again.',
          );
        },
      });
  }

  private toRequestPayload(): CreatePatientInput {
    const value = this.registrationForm.getRawValue();

    return {
      firstName: value.firstName.trim(),
      middleName: this.optionalText(value.middleName),
      lastName: value.lastName.trim(),
      dob: value.dob,
      email: this.optionalText(value.email),
      phone: this.optionalText(value.phone),
      gestationalAge: value.gestationalAge,
      firstPregnancy: value.firstPregnancy,
      previousComplications: this.optionalText(value.previousComplications),
    };
  }

  private optionalText(value: string | null) {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  }
}
