import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Environment as environment } from '../../environment/environment';
import { AuthService } from '../auth/auth-service';
import { DashboardService } from './dashboard-service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpTesting: HttpTestingController;
  const activeInstitutionId = signal<string | null>('inst-1');

  beforeEach(() => {
    activeInstitutionId.set('inst-1');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { activeInstitutionId, clinicianId: signal('user-1') } },
      ],
    });
    service = TestBed.inject(DashboardService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads assessment history for the selected institution', () => {
    service.getAssessments();

    expect(service.assessmentsLoading()).toBe(true);
    expect(service.assessmentsErrorMessage()).toBeNull();

    const request = httpTesting.expectOne(`${environment.api}/assessments`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(false);

    request.flush({ data: [] });

    expect(service.assessments()).toEqual([]);
    expect(service.assessmentsLoading()).toBe(false);
  });

  it('exposes a retryable assessment history error', () => {
    service.getAssessments();

    const request = httpTesting.expectOne(`${environment.api}/assessments`);
    request.flush({ message: 'Assessment access failed.' }, { status: 500, statusText: 'Error' });

    expect(service.assessments()).toBeNull();
    expect(service.assessmentsLoading()).toBe(false);
    expect(service.assessmentsErrorMessage()).toBe('Assessment access failed.');
  });

  it('loads an assessment detail and encodes its ID', () => {
    service.getAssessment('assessment/1');

    expect(service.assessmentLoading()).toBe(true);
    const request = httpTesting.expectOne(`${environment.api}/assessments/assessment%2F1`);
    request.flush({ data: { id: 'assessment/1' } });

    expect(service.assessment()?.id).toBe('assessment/1');
    expect(service.assessmentLoading()).toBe(false);
  });

  it('surfaces the backend not-found message for inaccessible assessments', () => {
    service.getAssessment('missing');

    const request = httpTesting.expectOne(`${environment.api}/assessments/missing`);
    request.flush(
      {
        statusCode: 404,
        code: 'ASSESSMENT_NOT_FOUND',
        message: 'The selected assessment does not exist.',
      },
      { status: 404, statusText: 'Not Found' },
    );

    expect(service.assessment()).toBeNull();
    expect(service.assessmentErrorMessage()).toBe('The selected assessment does not exist.');
  });
});
