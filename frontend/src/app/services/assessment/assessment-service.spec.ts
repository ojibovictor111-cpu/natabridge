import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Environment as environment } from '../../environment/environment';
import { AssessmentFormData } from '../../models/assessment/Assessment.api';
import { AssessmentService } from './assessment-service';

describe('AssessmentService result storage', () => {
  let service: AssessmentService;
  let httpTesting: HttpTestingController;

  const formData: AssessmentFormData = {
    age: 29,
    systolicBP: 120,
    diastolicBP: 80,
    bloodSugar: 6,
    bodyTemp: 37,
    heartRate: 80,
    gestationalAge: 24,
    firstPregnancy: true,
    previousComplications: null,
    dob: null,
    email: null,
    firstname: null,
    lastname: null,
    middlename: null,
    phone: null,
  };
  const result = {
    predictionRunId: 'run-1',
    predictionResultId: 'result-1',
    prediction: {
      confidence: 0.8,
      modelVersion: '1',
      risk: 'Low Risk',
      probabilities: { 'Low Risk': 0.8, 'Mid Risk': 0.15, 'High Risk': 0.05 },
      topFactors: [],
      recommendations: [],
    },
  };

  beforeEach(() => {
    localStorage.removeItem('assessment_access');
    localStorage.removeItem('assessment_input');
    localStorage.removeItem('assessment_result');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      ],
    });
    service = TestBed.inject(AssessmentService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('persists a public prediction for a guest', () => {
    service.submitPublicPrediction(formData);
    const request = httpTesting.expectOne(`${environment.api}/predictions`);
    expect(request.request.body).not.toHaveProperty('firstname');
    request.flush({ data: result });

    expect(localStorage.getItem('assessment_access')).toBe('public');
    expect(JSON.parse(localStorage.getItem('assessment_result') ?? 'null')).toEqual(result);
  });

  it('keeps a clinician assessment out of guest-accessible storage', () => {
    service.submitPatientAssessment('patient-1', formData);
    httpTesting.expectOne(`${environment.api}/patients/patient-1/assessments`).flush({
      data: { ...result, assessmentId: 'assessment-1', patientId: 'patient-1' },
    });

    expect(service.result()).toMatchObject({ assessmentId: 'assessment-1' });
    expect(localStorage.getItem('assessment_result')).toBeNull();
    expect(localStorage.getItem('assessment_input')).toBeNull();
    expect(localStorage.getItem('assessment_access')).toBeNull();
  });
});
