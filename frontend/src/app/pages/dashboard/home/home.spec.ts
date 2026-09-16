import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ClinicianAssessmentApi } from '../../../models/assessment/Clinician-assessment.api';
import { DashboardService } from '../../../services/dashboard/dashboard-service';
import { Home } from './home';

describe('DashboardHome', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  const clinicianAssessments = signal<ClinicianAssessmentApi[] | null>(null);
  const getClinicianAssessments = vi.fn();

  const assessment = (overrides: Partial<ClinicianAssessmentApi> = {}): ClinicianAssessmentApi => ({
    id: 'assessment-1',
    clinicianId: 'demo-user',
    assessedAt: new Date().toISOString(),
    patient: {
      id: 'patient-1',
      firstName: 'Amina',
      middleName: null,
      lastName: 'Bello',
      dob: '1997-04-12',
      email: 'amina@example.com',
      phone: null,
    },
    clinicalContext: {
      gestationalAge: 24,
      firstPregnancy: false,
      previousComplications: null,
    },
    measurements: {
      age: 29,
      systolicBP: 158,
      diastolicBP: 106,
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
      probabilities: { lowRisk: 0.02, midRisk: 0.07, highRisk: 0.91 },
      modelVersion: '1.0',
      response: null,
      factors: [],
    },
    ...overrides,
  });

  beforeEach(async () => {
    clinicianAssessments.set(null);
    getClinicianAssessments.mockClear();

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        {
          provide: DashboardService,
          useValue: { clinicianAssessments, getClinicianAssessments },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders unavailable values until clinician history loads', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(component).toBeTruthy();
    expect(getClinicianAssessments).toHaveBeenCalledOnce();
    expect(page.textContent).toContain('--');
    expect(page.textContent).toContain('No recent assessment data available');
  });

  it('derives live metrics and recent records from clinician history', () => {
    clinicianAssessments.set([
      assessment(),
      assessment({
        id: 'assessment-2',
        assessedAt: `${new Date().getFullYear()}-01-10T09:00:00.000Z`,
        patient: {
          id: 'patient-2',
          firstName: 'Chioma',
          middleName: null,
          lastName: 'Okafor',
          dob: '1994-02-03',
          email: null,
          phone: '+2348000000000',
        },
        prediction: {
          ...assessment().prediction,
          risk: 'Low Risk',
          probabilities: { lowRisk: 0.9, midRisk: 0.08, highRisk: 0.02 },
        },
      }),
    ]);
    fixture.detectChanges();

    const metricValues = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.metric-card > strong'),
    ).map((element) => element.textContent?.trim());

    expect(metricValues).toEqual(['1', '2', '1', '--']);
    expect(fixture.nativeElement.textContent).toContain('Amina Bello');
    expect(fixture.nativeElement.textContent).toContain('Chioma Okafor');
  });

  it('presents the Nata assistant as a disabled coming feature', () => {
    const card = (fixture.nativeElement as HTMLElement).querySelector('.assistant-card')!;
    const controls = card.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button');

    expect(card.getAttribute('aria-disabled')).toBe('true');
    expect(card.textContent).toContain('Coming soon');
    expect(Array.from(controls).every((control) => control.disabled)).toBe(true);
  });
});
