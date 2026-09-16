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
  const clinicianId = signal('demo-user');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { clinicianId } },
      ],
    });
    service = TestBed.inject(DashboardService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads clinician assessment history with credentials during the auth bypass', () => {
    service.getClinicianAssessments();

    const request = httpTesting.expectOne(
      `${environment.api}/clinicians/demo-user/assessments`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);

    request.flush({ data: [] });

    expect(service.clinicianAssessments()).toEqual([]);
  });

  it('encodes the signed-in clinician ID in the history URL', () => {
    clinicianId.set('clinic/user 1');

    service.getClinicianAssessments();

    const request = httpTesting.expectOne(
      `${environment.api}/clinicians/clinic%2Fuser%201/assessments`,
    );
    request.flush({ data: [] });
  });
});
