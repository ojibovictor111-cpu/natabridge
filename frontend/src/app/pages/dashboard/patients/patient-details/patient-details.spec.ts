import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PatientApi } from '../../../../models/patient/Patient.api';
import { PatientService } from '../../../../services/patient/patient-service';
import { PatientDetails } from './patient-details';

describe('PatientDetails', () => {
  let fixture: ComponentFixture<PatientDetails>;
  let component: PatientDetails;
  let loading: WritableSignal<boolean>;
  let errorMessage: WritableSignal<string | null>;
  let selectedPatient: WritableSignal<PatientApi | null>;
  let getPatient: ReturnType<typeof vi.fn>;

  const patient = (overrides: Partial<PatientApi> = {}): PatientApi => ({
    id: 'PAT-001',
    name: 'Amina Bello',
    age: 29,
    gestationalAge: 31,
    lastAssessment: '2026-08-08T12:30:00.000Z',
    currentRiskLevel: 'High Risk',
    ...overrides,
  });

  beforeEach(async () => {
    loading = signal(false);
    errorMessage = signal<string | null>(null);
    selectedPatient = signal<PatientApi | null>(null);
    getPatient = vi.fn();

    await TestBed.configureTestingModule({
      imports: [PatientDetails],
      providers: [
        provideRouter([]),
        {
          provide: PatientService,
          useValue: {
            loading,
            errorMessage,
            patient: selectedPatient,
            getPatient,
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createDetails(patientId = 'PAT-001'): void {
    fixture = TestBed.createComponent(PatientDetails);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', patientId);
    fixture.detectChanges();
  }

  function normalizedPageText(): string {
    return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.replace(/\s+/g, ' ').includes(label));
  }

  it('fetches the patient record using the route-bound input ID', () => {
    loading.set(true);

    createDetails('MAT-204');

    expect(getPatient).toHaveBeenCalledOnce();
    expect(getPatient).toHaveBeenCalledWith('MAT-204');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[aria-label="Loading patient record"]'),
    ).not.toBeNull();
  });

  it('fetches a new record when the route-bound patient ID changes', () => {
    selectedPatient.set(patient());
    createDetails();

    fixture.componentRef.setInput('id', 'PAT-002');
    fixture.detectChanges();

    expect(getPatient).toHaveBeenNthCalledWith(1, 'PAT-001');
    expect(getPatient).toHaveBeenNthCalledWith(2, 'PAT-002');
  });

  it('renders only the real fields available on the selected patient record', () => {
    selectedPatient.set(patient());

    createDetails();

    const pageText = normalizedPageText();
    expect(pageText).toContain('Amina Bello');
    expect(pageText).toContain('ID PAT-001');
    expect(pageText).toContain('29 years');
    expect(pageText).toContain('31 weeks');
    expect(pageText).toContain('High risk');
    expect(pageText).toContain('August 8, 2026');
    expect(pageText).not.toContain('John Doe');
    expect(pageText).not.toContain('James Samuel');
  });

  it('renders the service error when the patient record cannot be loaded', () => {
    errorMessage.set('Unable to load patient records right now. Please try again.');

    createDetails();

    expect(normalizedPageText()).toContain('Patient record unavailable');
    expect(normalizedPageText()).toContain(
      'Unable to load patient records right now. Please try again.',
    );
    expect(findButton('Try again')).toBeDefined();
  });

  it('renders a not-found fallback when no patient or service error is available', () => {
    createDetails('UNKNOWN');

    expect(normalizedPageText()).toContain('Patient record unavailable');
    expect(normalizedPageText()).toContain('We could not find a patient record for this link.');
  });

  it('offers another assessment when the patient has an assessment history', () => {
    selectedPatient.set(patient());
    createDetails();

    const assessmentLink = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '[aria-label="Take another assessment"]',
    );

    expect(assessmentLink?.textContent).toContain('Take another assessment');
    expect(assessmentLink?.getAttribute('href')).toBe('/dashboard/patients/PAT-001/assessment');
  });

  it('offers a new assessment when the patient has no assessment history', () => {
    selectedPatient.set(patient({ lastAssessment: null, currentRiskLevel: null }));
    createDetails();

    const assessmentLink = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '[aria-label="Take new assessment"]',
    );

    expect(assessmentLink?.textContent).toContain('Take new assessment');
    expect(assessmentLink?.getAttribute('href')).toBe('/dashboard/patients/PAT-001/assessment');
  });

  it('prints the patient summary from the enabled print action', () => {
    selectedPatient.set(patient());
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    createDetails();

    const printButton = findButton('Print summary');
    expect(printButton).toBeDefined();
    expect(printButton?.disabled).toBe(false);

    printButton?.click();

    expect(printSpy).toHaveBeenCalledOnce();
  });
});
