import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken, Injector } from '@angular/core';
import { catchError, from, of, switchMap, throwError } from 'rxjs';
import { Environment as environment } from '../../environment/environment';
import { readActiveInstitutionId } from '../auth/institution-context';

const accessDeniedCodes = new Set([
  'AUTHENTICATION_REQUIRED',
  'INVALID_ID_TOKEN',
  'USER_NOT_PROVISIONED',
  'USER_INACTIVE',
]);

export const FIREBASE_ID_TOKEN = new InjectionToken<() => Promise<string | null>>(
  'Firebase ID token for protected API requests',
  {
    providedIn: 'root',
    factory: () => async () => {
      const [{ getAuth }, { app }] = await Promise.all([import('firebase/auth'), import('./app')]);
      const auth = getAuth(app);
      await auth.authStateReady();
      return auth.currentUser?.getIdToken() ?? null;
    },
  },
);

export const firebaseTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (
    !request.url.startsWith(`${environment.api}/`) ||
    request.url === `${environment.api}/predictions`
  ) {
    return next(request);
  }

  const injector = inject(Injector);
  const getIdToken = inject(FIREBASE_ID_TOKEN);

  return from(getIdToken()).pipe(
    switchMap((token) => {
      if (!token) {
        return throwError(
          () => new Error('Firebase authentication is required for protected API requests.'),
        );
      }

      const institutionId = readActiveInstitutionId();
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

      if (institutionId) headers['X-Institution-Id'] = institutionId;

      return next(request.clone({ setHeaders: headers }));
    }),
    catchError((error: unknown) => {
      const code = error instanceof HttpErrorResponse ? error.error?.code : null;
      if (request.url !== `${environment.api}/users/me` && accessDeniedCodes.has(code)) {
        const message =
          code === 'USER_INACTIVE' || code === 'USER_NOT_PROVISIONED'
            ? 'Your NataBridge account no longer has access. Contact your facility administrator.'
            : 'Your sign-in session has expired. Please sign in again.';

        return from(
          import('../../services/auth/auth-service').then(({ AuthService }) =>
            injector.get(AuthService).expireSession(message),
          ),
        ).pipe(
          catchError(() => of(undefined)),
          switchMap(() => throwError(() => error)),
        );
      }
      return throwError(() => error);
    }),
  );
};
