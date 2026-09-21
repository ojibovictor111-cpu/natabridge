import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ClinicianAssessmentApi } from '../../../models/assessment/Clinician-assessment.api';
import { AuthService } from '../../../services/auth/auth-service';
import { DashboardService } from '../../../services/dashboard/dashboard-service';
import { Assessments } from './assessments';

describe('Assessments', () => {
  let fixture: ComponentFixture<Assessments>;
  const assessments = signal<ClinicianAssessmentApi[] | null>(null);
  const loading = signal(false);
  const errorMessage = signal<string | null>(null);
  const getAssessments = vi.fn();

  const assessment = (id: string, assessedAt: string, risk: string): ClinicianAssessmentApi => ({
    id,
    clinicianId: 'clinician-1',
    assessedAt,
    patient: {
      id: `patient-${id}`,
      firstName: id === 'newer' ? 'Amina' : 'Chioma',
      middleName: null,
      lastName: 'Bello',
      dob: '1997-04-12',
      email: null,
      phone: null,
    },
    clinicalContext: {
      gestationalAge: 24,
      firstPregnancy: false,
      previousComplications: null,
    },
    measurements: {
      age: 29,
      systolicBP: 128,
      diastolicBP: 82,
      bloodSugar: 5.2,
      bodyTemp: 37,
      heartRate: 88,
    },
    prediction: {
      runId: `run-${id}`,
      resultId: `result-${id}`,
      status: 'completed',
      risk,
      confidence: 0.91,
      probabilities: { lowRisk: 0.03, midRisk: 0.06, highRisk: 0.91 },
      modelVersion: '1.0',
      response: null,
      factors: [],
    },
  });

  beforeEach(async () => {
    assessments.set(null);
    loading.set(false);
    errorMessage.set(null);
    getAssessments.mockClear();

    await TestBed.configureTestingModule({
      imports: [Assessments],
      providers: [
        provideRouter([]),
        {
          provide: DashboardService,
          useValue: {
            assessments,
            assessmentsLoading: loading,
            assessmentsErrorMessage: errorMessage,
            getAssessments,
          },
        },
        { provide: AuthService, useValue: { hasAllPermissions: () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Assessments);
    fixture.detectChanges();
  });

  it('loads and renders all assessments with the newest first', () => {
    assessments.set([
      assessment('older', '2026-02-01T10:00:00.000Z', 'Low Risk'),
      assessment('newer', '2026-03-01T10:00:00.000Z', 'High Risk'),
    ]);
    fixture.detectChanges();

    const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')];

    expect(getAssessments).toHaveBeenCalledOnce();
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Amina Bello');
    expect(rows[1].textContent).toContain('Chioma Bello');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toContain('newer');
  });

  it('renders a retry state when assessment history fails', () => {
    errorMessage.set('Unable to load assessment records right now. Please try again.');
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Assessment records unavailable');
    expect(page.querySelector('[role="alert"]')).toBeTruthy();
  });
});
