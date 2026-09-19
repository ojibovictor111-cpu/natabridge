import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AssessmentResultApi } from '../../../models/assessment/Assessment-result.api';
import { AuthService } from '../../../services/auth/auth-service';
import { AssessmentResult } from './assessment-result';

describe('AssessmentResult', () => {
  let component: AssessmentResult;
  let fixture: ComponentFixture<AssessmentResult>;
  let isAuthenticated: ReturnType<typeof signal<boolean>>;

  const result: AssessmentResultApi = {
    assessmentId: 'assessment-1',
    patientId: 'patient-1',
    predictionRunId: 'run-1',
    predictionResultId: 'result-1',
    prediction: {
      confidence: 0.91,
      modelVersion: 'test-model',
      risk: 'High Risk',
      probabilities: {
        'Low Risk': 0.03,
        'Mid Risk': 0.06,
        'High Risk': 0.91,
      },
      topFactors: [],
      recommendations: [],
    },
  };

  beforeEach(async () => {
    isAuthenticated = signal(false);

    await TestBed.configureTestingModule({
      imports: [AssessmentResult],
      providers: [
        {
          provide: AuthService,
          useValue: { isUserAuthenticated: isAuthenticated },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssessmentResult);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();
  });

  function findButton(label: string): HTMLButtonElement | undefined {
    const element = fixture.nativeElement as HTMLElement;

    return Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.replace(/\s+/g, ' ').trim().includes(label),
    );
  }

  it('does not render Save to patient record for a guest', () => {
    expect(findButton('Save to patient record')).toBeUndefined();
  });

  it('does not render Generate referral letter for a guest', () => {
    expect(findButton('Generate referral letter')).toBeUndefined();
    expect(findButton('Print clinical report')).toBeDefined();
  });

  it('shows patient vitals without clinical interpretation for a guest', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.interpretation-list')).toBeNull();
    expect(page.textContent).not.toContain('Clinical interpretation');
    expect(page.textContent).toContain('Patient vitals');
  });

  it('uses a concise Back label for a guest', () => {
    const backButton = (fixture.nativeElement as HTMLElement).querySelector('.back-button');

    expect(backButton?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Back');
  });

  it('renders Save to patient record for an authenticated user', () => {
    isAuthenticated.set(true);
    fixture.detectChanges();

    expect(findButton('Save to patient record')).toBeDefined();
  });

  it('uses Back to patient for an authenticated user', () => {
    isAuthenticated.set(true);
    fixture.detectChanges();

    const backButton = (fixture.nativeElement as HTMLElement).querySelector('.back-button');

    expect(backButton?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Back to patient');
  });

  it('renders each unique clinical interpretation as a list item', () => {
    isAuthenticated.set(true);
    fixture.componentRef.setInput('result', {
      ...result,
      prediction: {
        ...result.prediction,
        recommendations: [
          {
            feature: 'SystolicBP',
            patientValue: 150,
            condition: 'Elevated blood pressure',
            actions: [],
            counselling: [],
          },
          {
            feature: 'HeartRate',
            patientValue: 110,
            condition: 'Elevated heart rate',
            actions: [],
            counselling: [],
          },
          {
            feature: 'DiastolicBP',
            patientValue: 95,
            condition: 'Elevated blood pressure',
            actions: [],
            counselling: [],
          },
        ],
      },
    } satisfies AssessmentResultApi);
    fixture.detectChanges();

    const items = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.interpretation-list li'),
    ).map((item) => item.textContent?.trim());

    expect(items).toEqual(['Elevated blood pressure', 'Elevated heart rate']);
  });

  it('disables unavailable referral and save actions', () => {
    isAuthenticated.set(true);
    fixture.detectChanges();

    expect(findButton('Generate referral letter')?.disabled).toBe(true);
    expect(findButton('Save to patient record')?.disabled).toBe(true);
  });

  it('keeps Print clinical report enabled and invokes printing', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const printButton = findButton('Print clinical report');

    expect(printButton).toBeDefined();
    expect(printButton?.disabled).toBe(false);

    printButton?.click();

    expect(printSpy).toHaveBeenCalledOnce();
  });
});
