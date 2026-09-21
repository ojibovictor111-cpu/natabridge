import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { Auth, User } from 'firebase/auth';
import { Environment as environment } from '../../environment/environment';
import { AssessmentService } from '../assessment/assessment-service';

import { AuthService, FIREBASE_AUTH } from './auth-service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;
  let firebaseUser: Pick<User, 'uid' | 'getIdToken'>;

  beforeEach(() => {
    firebaseUser = {
      uid: 'firebase-user-1',
      getIdToken: vi.fn(async () => 'firebase-token'),
    };
    const firebaseAuth = {
      currentUser: firebaseUser,
      authStateReady: vi.fn(async () => undefined),
      onAuthStateChanged: vi.fn((callback: (user: User | null) => void) => {
        callback(firebaseUser as User);
        return () => undefined;
      }),
    } as unknown as Auth;

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FIREBASE_AUTH, useValue: firebaseAuth },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        {
          provide: AssessmentService,
          useValue: { clearAssessmentStorage: vi.fn() },
        },
      ],
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('does not load the backend profile when Firebase restores a user on the auth page', () => {
    httpTesting.expectNone(`${environment.api}/users/me`);
    expect(firebaseUser.getIdToken).not.toHaveBeenCalled();
  });

  it('loads the backend profile when a protected route waits for the session', async () => {
    const session = service.waitForSession();
    let request: ReturnType<HttpTestingController['expectOne']>;

    await vi.waitFor(() => {
      request = httpTesting.expectOne(`${environment.api}/users/me`);
    });
    request!.flush({
      data: {
        id: 'user-1',
        email: 'user@example.com',
        roles: [],
      },
    });

    await expect(session).resolves.toBe(true);
    expect(firebaseUser.getIdToken).toHaveBeenCalledOnce();
  });
});
