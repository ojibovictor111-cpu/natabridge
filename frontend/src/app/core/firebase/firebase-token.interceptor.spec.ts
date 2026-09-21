import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Environment as environment } from '../../environment/environment';
import { AuthService } from '../../services/auth/auth-service';
import { FIREBASE_ID_TOKEN, firebaseTokenInterceptor } from './firebase-token.interceptor';
import { ACTIVE_INSTITUTION_STORAGE_KEY } from '../auth/institution-context';

describe('firebaseTokenInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let expireSession: ReturnType<typeof vi.fn>;
  let getIdToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    expireSession = vi.fn(async () => {});
    getIdToken = vi.fn(async () => 'firebase-token');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([firebaseTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: FIREBASE_ID_TOKEN, useValue: getIdToken },
        { provide: AuthService, useValue: { expireSession } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('sends a fresh Firebase ID token to protected API routes', async () => {
    const result = firstValueFrom(http.get(`${environment.api}/users/me`));
    let request!: TestRequest;
    await vi.waitFor(() => {
      request = httpTesting.expectOne(`${environment.api}/users/me`);
    });

    expect(request.request.headers.get('Authorization')).toBe('Bearer firebase-token');
    expect(request.request.withCredentials).toBe(false);
    request.flush({ data: { id: 'clinician-1', email: 'amina@example.com' } });
    await result;
  });

  it('sends the selected institution on protected API requests', async () => {
    sessionStorage.setItem(ACTIVE_INSTITUTION_STORAGE_KEY, 'inst-2');

    const result = firstValueFrom(http.get(`${environment.api}/assessments`));
    let request!: TestRequest;
    await vi.waitFor(() => {
      request = httpTesting.expectOne(`${environment.api}/assessments`);
    });

    expect(request.request.headers.get('X-Institution-Id')).toBe('inst-2');
    request.flush({ data: [] });
    await result;
  });

  it('keeps public predictions anonymous', async () => {
    const result = firstValueFrom(http.post(`${environment.api}/predictions`, {}));
    const request = httpTesting.expectOne(`${environment.api}/predictions`);

    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(getIdToken).not.toHaveBeenCalled();
    request.flush({ data: {} });
    await result;
  });

  it('does not send protected requests before Firebase returns an ID token', async () => {
    getIdToken.mockResolvedValue(null);

    const result = firstValueFrom(http.get(`${environment.api}/users/me`));

    await expect(result).rejects.toThrow(
      'Firebase authentication is required for protected API requests.',
    );
    httpTesting.expectNone(`${environment.api}/users/me`);
  });

  it('ends the session when the backend revokes account access', async () => {
    const result = firstValueFrom(http.get(`${environment.api}/patients`));
    let request!: TestRequest;
    await vi.waitFor(() => {
      request = httpTesting.expectOne(`${environment.api}/patients`);
    });
    request.flush(
      { code: 'USER_INACTIVE', message: 'This account is inactive.' },
      { status: 403, statusText: 'Forbidden' },
    );

    await expect(result).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(expireSession).toHaveBeenCalledOnce();
  });

  it('does not sign out for an unrelated forbidden response', async () => {
    const result = firstValueFrom(http.get(`${environment.api}/clinicians/other/assessments`));
    let request!: TestRequest;
    await vi.waitFor(() => {
      request = httpTesting.expectOne(`${environment.api}/clinicians/other/assessments`);
    });
    request.flush(
      { code: 'FORBIDDEN', message: 'You cannot view another clinician\'s assessments.' },
      { status: 403, statusText: 'Forbidden' },
    );

    await expect(result).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(expireSession).not.toHaveBeenCalled();
  });
});
