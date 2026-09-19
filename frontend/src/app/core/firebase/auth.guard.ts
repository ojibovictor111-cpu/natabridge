import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth-service';

export const requireFirebaseUser = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return (await authService.waitForSession()) || router.createUrlTree(['/auth']);
};
