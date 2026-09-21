import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ClinicianAssessmentApi } from '../../../../models/assessment/Clinician-assessment.api';
import { DashboardService } from '../../../../services/dashboard/dashboard-service';
import { AssessmentDetails } from './assessment-details';

describe('AssessmentDetails', () => {
  let fixture: ComponentFixture<AssessmentDetails>;
  const assessment = signal<ClinicianAssessmentApi | null>(null);
  const loading = signal(false);
  const errorMessage = signal<string | null>(null);
  const getAssessment = vi.fn();

  const record: ClinicianAssessmentApi = {
    id: 'assessment-1',
    clinicianId: 'clinician-1',
    assessedAt: '2026-03-01T10:00:00.000Z',
    patient: {
      id: 'patient-1',
      firstName: 'Amina',
      middleName: null,
      lastName: 'Bello',
      dob: '1997-04-12',
      email: 'amina@example.com',
      phone: '+2348000000000',
    },
    clinicalContext: {
      gestationalAge: 24,
      firstPregnancy: false,
      previousComplications: 'Previous hypertension',
    },
    measurements: {
      age: 29,
      systolicBP: 148,
      diastolicBP: 96,
      bloodSugar: 5.2,
      bodyTemp: 37,
      heartRate: 92,
    },
    prediction: {
      runId: 'run-1',
      resultId: 'result-1',
      status: 'completed',
      risk: 'High Risk',
      confidence: 0.91,
      probabilities: { lowRisk: 0.03, midRisk: 0.06, highRisk: 0.91 },
      modelVersion: '1.0',
      response: null,
      factors: [{ feature: 'SystolicBP', impact: 0.42 }],
    },
  };

  beforeEach(async () => {
    assessment.set(null);
    loading.set(false);
    errorMessage.set(null);
    getAssessment.mockClear();

    await TestBed.configureTestingModule({
      imports: [AssessmentDetails],
      providers: [
        provideRouter([]),
        {
          provide: DashboardService,
          useValue: {
            assessment,
            assessmentLoading: loading,
            assessmentErrorMessage: errorMessage,
            getAssessment,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssessmentDetails);
    fixture.componentRef.setInput('assessmentId', 'assessment-1');
    fixture.detectChanges();
  });

  it('loads and renders the complete assessment record', () => {
    assessment.set(record);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(getAssessment).toHaveBeenCalledWith('assessment-1');
    expect(page.textContent).toContain('Amina Bello');
    expect(page.textContent).toContain('Previous hypertension');
    expect(page.textContent).toContain('148 mmHg');
    expect(page.textContent).toContain('91%');
    expect(page.textContent).toContain('SystolicBP');
  });

  it('shows the backend not-found message', () => {
    errorMessage.set('The selected assessment does not exist.');
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')).toBeTruthy();
    expect(page.textContent).toContain('The selected assessment does not exist.');
  });
});
