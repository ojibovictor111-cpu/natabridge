import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth/auth-service';
import { requireAllPermissions, requireAnyPermission } from './permission.guard';

describe('permission guards', () => {
  const waitForSession = vi.fn(async () => true);
  const hasAllPermissions = vi.fn();
  const hasAnyPermission = vi.fn();

  beforeEach(() => {
    waitForSession.mockClear();
    hasAllPermissions.mockReset();
    hasAnyPermission.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { waitForSession, hasAllPermissions, hasAnyPermission },
        },
      ],
    });
  });

  it('allows a route when every required permission is present', async () => {
    hasAllPermissions.mockReturnValue(true);

    const result = await runGuard(requireAllPermissions(['clinical.beneficiaries.read']));

    expect(result).toBe(true);
  });

  it('redirects direct navigation when a required permission is missing', async () => {
    hasAllPermissions.mockReturnValue(false);

    const result = await runGuard(requireAllPermissions(['clinical.beneficiaries.create']));
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe(
      '/dashboard/forbidden?returnUrl=%2Fdashboard%2Fpatients%2Fregister',
    );
  });

  it('allows navigation groups when one listed permission is present', async () => {
    hasAnyPermission.mockReturnValue(true);

    const result = await runGuard(
      requireAnyPermission(['clinical.assessments.read', 'clinical.beneficiaries.read']),
    );

    expect(result).toBe(true);
  });

  function runGuard(guard: ReturnType<typeof requireAllPermissions>) {
    return TestBed.runInInjectionContext(() =>
      guard(
        {} as ActivatedRouteSnapshot,
        { url: '/dashboard/patients/register' } as RouterStateSnapshot,
      ),
    );
  }
});
