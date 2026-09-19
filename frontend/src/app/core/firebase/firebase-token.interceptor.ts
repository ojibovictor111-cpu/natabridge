import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { Environment as environment } from '../../environment/environment';

export const firebaseTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (
    !request.url.startsWith(`${environment.api}/`) ||
    request.url === `${environment.api}/predictions`
  ) {
    return next(request);
  }

  return from(
    Promise.all([import('firebase/auth'), import('./app')]).then(async ([{ getAuth }, { app }]) => {
      const auth = getAuth(app);
      await auth.authStateReady();
      return auth.currentUser?.getIdToken() ?? null;
    }),
  ).pipe(
    switchMap((token) =>
      next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request),
    ),
  );
};
