import { Component, DestroyRef, effect, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroArrowLongRight, heroSlash } from '@ng-icons/heroicons/outline';
import { AssessmentFormData } from '../../../models/assessment/Assessment.api';
import { AssessmentService } from '../../../services/assessment/assessment-service';
import { AcknowledgementDialog } from '../../modals/acknowledgement-dialog/acknowledgement-dialog';
import { EmergencyOverrideDialog } from '../../modals/emergency-override-dialog/emergency-override-dialog';

function calculateAgeFromDateOfBirth(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;

  const [year, month, day] = dateOfBirth.split('-').map(Number);
  if (!year || !month || !day) return null;

  const parsedDate = new Date(year, month - 1, day);
  const isValidDate =
    parsedDate.getFullYear() === year &&
    parsedDate.getMonth() === month - 1 &&
    parsedDate.getDate() === day;

  if (!isValidDate) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const birthdayHasPassed =
    today.getMonth() > month - 1 || (today.getMonth() === month - 1 && today.getDate() >= day);

  if (!birthdayHasPassed) age -= 1;

  return age >= 0 ? age : null;
}

const adultDateOfBirthValidator: ValidatorFn = (
  control: AbstractControl<string | null>,
): ValidationErrors | null => {
  if (!control.value) return null;

  const age = calculateAgeFromDateOfBirth(control.value);
  if (age === null) return { invalidDate: true };

  return age < 18 ? { underage: true } : null;
};

@Component({
  selector: 'nata-assessment-test',
  imports: [NgIcon, NgTemplateOutlet, MatStepperModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './assessment-test.html',
  styleUrl: './assessment-test.css',
  viewProviders: [provideIcons({ heroArrowLongRight, heroSlash })],
})
export class AssessmentTest {
  private readonly dialog = inject(MatDialog);
  private readonly assessmentService = inject(AssessmentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly userAuthenticated = input(false);
  readonly patientId = input<string | null>(null);
  readonly patientAge = input<number | null>(null);
  readonly hasPreviousAssessment = input(false);
  readonly maximumDateOfBirth = this.formatDateForInput(new Date());
  readonly submissionError = this.assessmentService.errorMessage.asReadonly();

  readonly personalInformationFormGroup = new FormGroup({
    lastname: new FormControl<string | null>(null, [Validators.required]),
    firstname: new FormControl<string | null>(null, [Validators.required]),
    middlename: new FormControl<string | null>(null),
    email: new FormControl<string | null>(null, [Validators.required, Validators.email]),
    phone: new FormControl<string | null>(null, [Validators.required]),
    dob: new FormControl<string | null>(null, [Validators.required, adultDateOfBirthValidator]),
  });

  readonly pregnancyInformationFormGroup = new FormGroup({
    gestationalAge: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(45),
    ]),
    firstPregnancy: new FormControl<boolean | null>(null),
    previousComplications: new FormControl<string | null>(null),
  });

  readonly healthMeasurementsFormGroup = new FormGroup({
    systolicBP: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(60),
      Validators.max(250),
    ]),
    diastolicBP: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(30),
      Validators.max(150),
    ]),
    age: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(10),
      Validators.max(70),
    ]),
    bloodSugar: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(2),
      Validators.max(9999.99),
    ]),
    bodyTemp: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(36),
      Validators.max(43),
    ]),
    heartRate: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(30),
      Validators.max(220),
    ]),
  });

  constructor() {
    const dobControl = this.personalInformationFormGroup.controls.dob;

    this.updateAgeFromDateOfBirth(dobControl.value);
    dobControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((dateOfBirth) => this.updateAgeFromDateOfBirth(dateOfBirth));

    effect(() => {
      const patientAge = this.patientAge();

      if (this.patientId() && patientAge !== null) {
        this.healthMeasurementsFormGroup.controls.age.setValue(patientAge, {
          emitEvent: false,
        });
      }
    });

    effect(() => {
      const gestationalAgeControl = this.pregnancyInformationFormGroup.controls.gestationalAge;

      if (this.hasPreviousAssessment()) {
        gestationalAgeControl.clearValidators();
        gestationalAgeControl.setValue(null, { emitEvent: false });
        this.pregnancyInformationFormGroup.controls.firstPregnancy.setValue(null, {
          emitEvent: false,
        });
      } else {
        gestationalAgeControl.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(45),
        ]);
      }

      gestationalAgeControl.updateValueAndValidity({ emitEvent: false });
    });
  }

  prepareDataForSubmission(): AssessmentFormData {
    const personal = this.personalInformationFormGroup.getRawValue();
    const pregnancy = this.pregnancyInformationFormGroup.getRawValue();
    const health = this.healthMeasurementsFormGroup.getRawValue();

    return {
      ...personal,
      ...pregnancy,
      age: health.age!,
      bloodSugar: health.bloodSugar!,
      bodyTemp: health.bodyTemp!,
      diastolicBP: health.diastolicBP!,
      systolicBP: health.systolicBP!,
      heartRate: health.heartRate!,
    };
  }

  isValidForSubmission(): boolean {
    if (!this.userAuthenticated()) return this.healthMeasurementsFormGroup.valid;

    return (
      (Boolean(this.patientId()) || this.personalInformationFormGroup.valid) &&
      this.pregnancyInformationFormGroup.valid &&
      this.healthMeasurementsFormGroup.valid
    );
  }

  openDialog(): void {
    if (!this.isValidForSubmission()) {
      this.healthMeasurementsFormGroup.markAllAsTouched();

      if (this.userAuthenticated() && !this.patientId()) {
        this.personalInformationFormGroup.markAllAsTouched();
        this.pregnancyInformationFormGroup.markAllAsTouched();
      }

      return;
    }

    if (this.isEmergency()) {
      const { systolicBP, diastolicBP } = this.healthMeasurementsFormGroup.getRawValue();

      this.dialog.open(EmergencyOverrideDialog, {
        width: 'calc(100vw - 32px)',
        maxWidth: '460px',
        panelClass: 'assessment-dialog-panel',
        autoFocus: 'dialog',
        role: 'alertdialog',
        ariaLabelledBy: 'emergency-dialog-title',
        ariaModal: true,
        data: { systolicBP, diastolicBP },
      });
      return;
    }

    const dialogRef = this.dialog.open(AcknowledgementDialog, {
      width: 'calc(100vw - 32px)',
      maxWidth: '500px',
      panelClass: 'assessment-dialog-panel',
      autoFocus: 'first-tabbable',
      ariaLabelledBy: 'consent-dialog-title',
      ariaModal: true,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((agreed) => {
        if (agreed === true) {
          const formData = this.prepareDataForSubmission();
          const patientId = this.patientId();

          if (!this.userAuthenticated()) {
            this.assessmentService.submitPublicPrediction(formData);
          } else if (patientId) {
            this.assessmentService.submitPatientAssessment(patientId, formData);
          } else {
            this.assessmentService.createPatientAndSubmitAssessment(formData);
          }
        }
      });
  }

  isEmergency(): boolean {
    const { systolicBP, diastolicBP } = this.healthMeasurementsFormGroup.getRawValue();

    if (systolicBP === null || diastolicBP === null) return false;

    return systolicBP >= 160 || diastolicBP >= 110;
  }

  private updateAgeFromDateOfBirth(dateOfBirth: string | null): void {
    this.healthMeasurementsFormGroup.controls.age.setValue(
      calculateAgeFromDateOfBirth(dateOfBirth),
      { emitEvent: false },
    );
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
