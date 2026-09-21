import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PatientApi } from '../../../models/patient/Patient.api';
import { AuthService } from '../../../services/auth/auth-service';
import { PatientService } from '../../../services/patient/patient-service';
import { Patients } from './patients';

describe('Patients', () => {
  let component: Patients;
  let fixture: ComponentFixture<Patients>;
  let loading: WritableSignal<boolean>;
  let errorMessage: WritableSignal<string | null>;
  let patients: WritableSignal<PatientApi[]>;
  let getPatients: ReturnType<typeof vi.fn>;

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
    loading = signal(true);
    errorMessage = signal<string | null>(null);
    patients = signal<PatientApi[]>([]);
    getPatients = vi.fn();

    await TestBed.configureTestingModule({
      imports: [Patients],
      providers: [
        provideRouter([]),
        {
          provide: PatientService,
          useValue: { loading, errorMessage, patients, getPatients },
        },
        { provide: AuthService, useValue: { hasAllPermissions: () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Patients);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function patientRows(): HTMLTableRowElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLTableRowElement>(
        '.patient-table tbody tr',
      ),
    );
  }

  function normalizedText(element: Element | null): string {
    return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  it('requests patients and shows the loading state while the directory is empty', () => {
    expect(getPatients).toHaveBeenCalledOnce();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[aria-label="Loading patient records"]',
      ),
    ).not.toBeNull();
    expect(patientRows()).toHaveLength(0);
  });

  it('shows a single primary error state when the first patient load fails', () => {
    loading.set(false);
    errorMessage.set('Unable to load patient records right now. Please try again.');
    fixture.detectChanges();

    expect(
      normalizedText((fixture.nativeElement as HTMLElement).querySelector('.directory-empty')),
    ).toContain('Patient records unavailable');
    expect(normalizedText(fixture.nativeElement as HTMLElement)).not.toContain(
      'No patient records yet',
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.directory-pagination'),
    ).toBeNull();
  });

  it('renders API-backed patient rows and summary counts', () => {
    patients.set([
      patient(),
      patient({
        id: 'PAT-002',
        name: 'Chioma Okafor',
        age: 34,
        gestationalAge: 24,
        lastAssessment: null,
        currentRiskLevel: 'low',
      }),
    ]);
    loading.set(false);
    fixture.detectChanges();

    expect(patientRows()).toHaveLength(2);
    expect(normalizedText(patientRows()[0])).toContain('Amina Bello');
    expect(normalizedText(patientRows()[0])).toContain('31 weeks');
    expect(normalizedText(patientRows()[0])).toContain('High risk');

    const stats = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.patient-stat strong'),
    ).map(normalizedText);

    expect(stats).toEqual(['2', '1', '1']);
  });

  it('searches patients by either name or record ID', () => {
    patients.set([
      patient(),
      patient({ id: 'MAT-204', name: 'Chioma Okafor', currentRiskLevel: 'low' }),
      patient({ id: 'REC-809', name: 'Fatima Musa', currentRiskLevel: null }),
    ]);
    loading.set(false);
    fixture.detectChanges();

    const search = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '.patient-search-field input',
    )!;

    search.value = ' chioma ';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(patientRows()).toHaveLength(1);
    expect(normalizedText(patientRows()[0])).toContain('Chioma Okafor');

    search.value = 'rec-809';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(patientRows()).toHaveLength(1);
    expect(normalizedText(patientRows()[0])).toContain('Fatima Musa');
  });

  it('normalizes backend risk labels and filters by the normalized risk', () => {
    patients.set([
      patient({ currentRiskLevel: 'HIGH RISK' }),
      patient({ id: 'PAT-002', name: 'Chioma Okafor', currentRiskLevel: 'Medium concern' }),
      patient({ id: 'PAT-003', name: 'Fatima Musa', currentRiskLevel: 'low' }),
      patient({ id: 'PAT-004', name: 'Grace Peter', currentRiskLevel: null }),
    ]);
    loading.set(false);
    fixture.detectChanges();

    expect(component.riskTone('HIGH RISK')).toBe('high');
    expect(component.riskTone('Medium concern')).toBe('mid');
    expect(component.riskLabel(null)).toBe('Not assessed');

    const filter = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
      '.risk-filter-field select',
    )!;
    filter.value = 'mid';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(patientRows()).toHaveLength(1);
    expect(normalizedText(patientRows()[0])).toContain('Chioma Okafor');
    expect(normalizedText(patientRows()[0])).toContain('Mid risk');

    filter.value = 'none';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(patientRows()).toHaveLength(1);
    expect(normalizedText(patientRows()[0])).toContain('Grace Peter');
    expect(normalizedText(patientRows()[0])).toContain('Not assessed');
  });

  it('links each patient row to its patient-detail route', () => {
    patients.set([patient({ id: 'MAT-204', name: 'Chioma Okafor' })]);
    loading.set(false);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '.patient-action-cell a',
    );

    expect(link?.getAttribute('href')).toBe('/dashboard/patients/MAT-204');
    expect(link?.getAttribute('aria-label')).toBe('View Chioma Okafor patient record');
  });

  it('sorts patient rows from the accessible column controls', () => {
    patients.set([
      patient({ id: 'PAT-002', name: 'Amina Bello', age: 29 }),
      patient({ id: 'PAT-001', name: 'Chioma Okafor', age: 34 }),
    ]);
    loading.set(false);
    fixture.detectChanges();

    const ageSort = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('th button'),
    ).find((button) => normalizedText(button).includes('Age'))!;

    ageSort.click();
    fixture.detectChanges();
    expect(normalizedText(patientRows()[0])).toContain('Amina Bello');

    ageSort.click();
    fixture.detectChanges();
    expect(normalizedText(patientRows()[0])).toContain('Chioma Okafor');
  });
});
