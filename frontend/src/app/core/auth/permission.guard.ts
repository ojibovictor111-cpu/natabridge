import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth-service';

export function requireAllPermissions(required: readonly string[]): CanActivateFn {
  return async (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await authService.waitForSession();

    return (
      authService.hasAllPermissions(required) ||
      router.createUrlTree(['/dashboard/forbidden'], {
        queryParams: { returnUrl: state.url },
      })
    );
  };
}

export function requireAnyPermission(required: readonly string[]): CanActivateFn {
  return async (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await authService.waitForSession();

    return (
      authService.hasAnyPermission(required) ||
      router.createUrlTree(['/dashboard/forbidden'], {
        queryParams: { returnUrl: state.url },
      })
    );
  };
}
