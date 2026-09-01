import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Environment as environment } from '../../environment/environment';
import { CreatePatientInput, PatientApi } from '../../models/patient/Patient.api';
import { PatientService } from './patient-service';

describe('PatientService', () => {
  let service: PatientService;
  let httpTesting: HttpTestingController;

  const patients: PatientApi[] = [
    {
      id: 'patient-1',
      name: 'Amina Bello',
      age: 29,
      gestationalAge: 31,
      lastAssessment: '2026-08-10T09:30:00.000Z',
      currentRiskLevel: 'High Risk',
    },
    {
      id: 'patient-2',
      name: 'Chioma Okafor',
      age: 33,
      gestationalAge: null,
      lastAssessment: null,
      currentRiskLevel: null,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PatientService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loads the patient collection with credentials', () => {
    service.getPatients();

    expect(service.loading()).toBe(true);
    expect(service.errorMessage()).toBeNull();

    const request = httpTesting.expectOne(`${environment.api}/patients`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);

    request.flush({ data: patients });

    expect(service.patients()).toEqual(patients);
    expect(service.loading()).toBe(false);
    expect(service.errorMessage()).toBeNull();
  });

  it('registers a patient with the complete registration payload', () => {
    const payload: CreatePatientInput = {
      firstName: 'Amina',
      middleName: null,
      lastName: 'Bello',
      dob: '1997-04-12',
      email: 'amina@example.com',
      phone: null,
      gestationalAge: 24,
      firstPregnancy: false,
      previousComplications: 'Previous pre-eclampsia',
    };

    service.registerPatient(payload).subscribe();

    const request = httpTesting.expectOne(`${environment.api}/patients`);
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual(payload);

    request.flush({
      data: {
        id: 'patient-3',
        firstName: 'Amina',
        middleName: null,
        lastName: 'Bello',
        dob: '1997-04-12',
        email: 'amina@example.com',
        phone: null,
        createdAt: '2026-09-01T12:00:00.000Z',
      },
    });
  });

  it('selects a cached patient without making another request', () => {
    service.patients.set(patients);
    service.loading.set(true);
    service.errorMessage.set('Previous error');

    service.getPatient('patient-1');

    expect(service.patient()).toEqual(patients[0]);
    expect(service.loading()).toBe(false);
    expect(service.errorMessage()).toBeNull();
    httpTesting.expectNone(`${environment.api}/patients`);
  });

  it('looks up an uncached patient through the existing collection endpoint', () => {
    service.getPatient('patient-2');

    expect(service.loading()).toBe(true);
    expect(service.patient()).toBeNull();

    const request = httpTesting.expectOne(`${environment.api}/patients`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);

    request.flush({ data: patients });

    expect(service.patients()).toEqual(patients);
    expect(service.patient()).toEqual(patients[1]);
    expect(service.loading()).toBe(false);
    expect(service.errorMessage()).toBeNull();
  });

  it('reports a missing patient after the collection lookup completes', () => {
    service.getPatient('patient-missing');

    const request = httpTesting.expectOne(`${environment.api}/patients`);
    request.flush({ data: patients });

    expect(service.patient()).toBeNull();
    expect(service.patients()).toEqual(patients);
    expect(service.loading()).toBe(false);
    expect(service.errorMessage()).toBe('Patient record could not be found.');
  });

  it('surfaces a readable API error while loading a patient', () => {
    service.getPatient('patient-1');

    const request = httpTesting.expectOne(`${environment.api}/patients`);
    request.flush(
      { message: 'Your session has expired. Please sign in again.' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(service.patient()).toBeNull();
    expect(service.loading()).toBe(false);
    expect(service.errorMessage()).toBe('Your session has expired. Please sign in again.');
  });

  it('uses a readable fallback when patient records cannot be reached', () => {
    service.getPatients();

    const request = httpTesting.expectOne(`${environment.api}/patients`);
    request.error(new ProgressEvent('network error'));

    expect(service.loading()).toBe(false);
    expect(service.errorMessage()).toBe(
      'Unable to reach patient records. Check your connection and try again.',
    );
  });
});
