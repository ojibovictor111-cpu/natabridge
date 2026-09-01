import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { AssessmentService } from '../../../services/assessment/assessment-service';
import { AcknowledgementDialog } from '../../modals/acknowledgement-dialog/acknowledgement-dialog';
import { EmergencyOverrideDialog } from '../../modals/emergency-override-dialog/emergency-override-dialog';
import { AssessmentTest } from './assessment-test';

describe('AssessmentTest', () => {
  let component: AssessmentTest;
  let fixture: ComponentFixture<AssessmentTest>;
  let dialog: { open: ReturnType<typeof vi.fn> };
  let assessmentService: {
    errorMessage: ReturnType<typeof signal<string | null>>;
    submitPublicPrediction: ReturnType<typeof vi.fn>;
    submitPatientAssessment: ReturnType<typeof vi.fn>;
    createPatientAndSubmitAssessment: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    dialog = { open: vi.fn() };
    assessmentService = {
      errorMessage: signal<string | null>(null),
      submitPublicPrediction: vi.fn(),
      submitPatientAssessment: vi.fn(),
      createPatientAndSubmitAssessment: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [AssessmentTest],
    });
    TestBed.overrideComponent(AssessmentTest, {
      add: {
        providers: [
          { provide: MatDialog, useValue: dialog },
          { provide: AssessmentService, useValue: assessmentService },
        ],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AssessmentTest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function setAuthenticated(value: boolean): void {
    fixture.componentRef.setInput('userAuthenticated', value);
    fixture.detectChanges();
  }

  function setValidPersonalInformation(): void {
    component.personalInformationFormGroup.setValue({
      lastname: 'Bello',
      firstname: 'Amina',
      middlename: null,
      email: 'amina@example.com',
      phone: '+2348000000000',
      dob: '2000-01-01',
    });
  }

  function setValidPregnancyInformation(
    firstPregnancy: boolean | null = null,
    previousComplications: string | null = null,
  ): void {
    component.pregnancyInformationFormGroup.setValue({
      gestationalAge: 24,
      firstPregnancy,
      previousComplications,
    });
  }

  function setValidHealthMeasurements(systolicBP = 120, diastolicBP = 80): void {
    component.healthMeasurementsFormGroup.setValue({
      systolicBP,
      diastolicBP,
      age: 26,
      bloodSugar: 4.8,
      bodyTemp: 37,
      heartRate: 78,
    });
  }

  it('requires only health measurements for a guest and all form groups for an authenticated user', () => {
    setValidHealthMeasurements();

    expect(component.personalInformationFormGroup.invalid).toBe(true);
    expect(component.pregnancyInformationFormGroup.invalid).toBe(true);
    expect(component.isValidForSubmission()).toBe(true);

    setAuthenticated(true);
    expect(component.isValidForSubmission()).toBe(false);

    setValidPersonalInformation();
    setValidPregnancyInformation();

    expect(component.isValidForSubmission()).toBe(true);
  });

  it('calculates age when date of birth changes', () => {
    component.personalInformationFormGroup.controls.dob.setValue('2000-01-01');

    expect(component.healthMeasurementsFormGroup.controls.age.value).toBe(
      new Date().getFullYear() - 2000,
    );
  });

  it('keeps an under-18 date of birth from completing the personal-information step', () => {
    const today = new Date();
    const underageDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
    const dateValue = [
      underageDate.getFullYear(),
      `${underageDate.getMonth() + 1}`.padStart(2, '0'),
      `${underageDate.getDate()}`.padStart(2, '0'),
    ].join('-');

    component.personalInformationFormGroup.controls.dob.setValue(dateValue);

    expect(component.personalInformationFormGroup.controls.dob.hasError('underage')).toBe(true);
    expect(component.personalInformationFormGroup.invalid).toBe(true);
  });

  it('preserves typed first-pregnancy and complications values in the submission payload', () => {
    setValidPersonalInformation();
    setValidPregnancyInformation(false, 'Previous pre-eclampsia');
    setValidHealthMeasurements();

    const payload = component.prepareDataForSubmission();

    expect(payload.firstPregnancy).toBe(false);
    expect(typeof payload.firstPregnancy).toBe('boolean');
    expect(payload.previousComplications).toBe('Previous pre-eclampsia');
  });

  it('skips saved patient fields for a repeat assessment', () => {
    setAuthenticated(true);
    fixture.componentRef.setInput('patientId', 'PAT-001');
    fixture.componentRef.setInput('patientAge', 29);
    fixture.componentRef.setInput('hasPreviousAssessment', true);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('#firstname')).toBeNull();
    expect(page.querySelector('#gestationalAge')).toBeNull();
    expect(page.querySelector('#firstPregnancy')).toBeNull();
    expect(component.pregnancyInformationFormGroup.controls.gestationalAge.value).toBeNull();
    expect(component.healthMeasurementsFormGroup.controls.age.value).toBe(29);
  });

  it('pre-populates age from the selected patient record', () => {
    setAuthenticated(true);
    fixture.componentRef.setInput('patientId', 'PAT-001');
    fixture.componentRef.setInput('patientAge', 34);
    fixture.detectChanges();

    const ageInput = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#age');

    expect(component.healthMeasurementsFormGroup.controls.age.value).toBe(34);
    expect(ageInput?.value).toBe('34');
  });

  it('submits a repeat assessment against the selected patient record', () => {
    setAuthenticated(true);
    fixture.componentRef.setInput('patientId', 'PAT-001');
    fixture.componentRef.setInput('hasPreviousAssessment', true);
    setValidHealthMeasurements();
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    fixture.detectChanges();

    component.openDialog();

    expect(assessmentService.submitPatientAssessment).toHaveBeenCalledWith(
      'PAT-001',
      component.prepareDataForSubmission(),
    );
    expect(assessmentService.createPatientAndSubmitAssessment).not.toHaveBeenCalled();
  });

  it('submits the assessment after consent is accepted', () => {
    setValidHealthMeasurements();
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });

    component.openDialog();

    expect(dialog.open).toHaveBeenCalledWith(
      AcknowledgementDialog,
      expect.objectContaining({ panelClass: 'assessment-dialog-panel' }),
    );
    expect(assessmentService.submitPublicPrediction).toHaveBeenCalledOnce();
    expect(assessmentService.submitPublicPrediction).toHaveBeenCalledWith(
      component.prepareDataForSubmission(),
    );
  });

  it('does not submit the assessment when consent is declined', () => {
    setValidHealthMeasurements();
    dialog.open.mockReturnValue({ afterClosed: () => of(false) });

    component.openDialog();

    expect(dialog.open).toHaveBeenCalledWith(AcknowledgementDialog, expect.any(Object));
    expect(assessmentService.submitPublicPrediction).not.toHaveBeenCalled();
  });

  it.each([
    [160, 80],
    [120, 110],
  ])(
    'opens the emergency dialog at the severe hypertension threshold %i/%i',
    (systolicBP, diastolicBP) => {
      setValidHealthMeasurements(systolicBP, diastolicBP);
      dialog.open.mockReturnValue({});

      component.openDialog();

      expect(dialog.open).toHaveBeenCalledWith(
        EmergencyOverrideDialog,
        expect.objectContaining({ data: { systolicBP, diastolicBP } }),
      );
      expect(assessmentService.submitPublicPrediction).not.toHaveBeenCalled();
    },
  );

  it('does not classify readings immediately below both emergency thresholds as an emergency', () => {
    setValidHealthMeasurements(159, 109);

    expect(component.isEmergency()).toBe(false);
  });
});
