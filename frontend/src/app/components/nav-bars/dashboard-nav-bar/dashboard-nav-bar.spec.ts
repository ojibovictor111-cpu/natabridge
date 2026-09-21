import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { DashboardNavBar } from './dashboard-nav-bar';
import { AuthService } from '../../../services/auth/auth-service';

describe('DashboardNavBar', () => {
  let component: DashboardNavBar;
  let fixture: ComponentFixture<DashboardNavBar>;
  const grantedPermissions = [
    'clinical.assessments.read',
    'clinical.beneficiaries.read',
    'clinical.beneficiaries.create',
    'clinical.assessments.create',
    'clinical.predictions.run',
  ];
  let permissions: WritableSignal<Set<string>>;

  beforeEach(async () => {
    permissions = signal(new Set(grantedPermissions));

    await TestBed.configureTestingModule({
      imports: [DashboardNavBar],
      providers: [
        provideRouter([]),
        { provide: MatDialog, useValue: { open: vi.fn() } },
        {
          provide: AuthService,
          useValue: {
            user: signal({ id: 'clinician-1', email: 'amina@example.com', roles: [] }),
            roleLabels: signal(['Clinician']),
            hasAllPermissions: (required: readonly string[]) =>
              required.every((permission) => permissions().has(permission)),
            hasAnyPermission: (required: readonly string[]) =>
              required.some((permission) => permissions().has(permission)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardNavBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the verified clinician identity', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[hlmSidebarFooter] strong')?.textContent).toContain(
      'amina@example.com',
    );
    expect(page.querySelector('[hlmSidebarFooter] [hlmAvatarFallback]')?.textContent).toContain(
      'AM',
    );
  });

  it('renders the dashboard routes as Spartan sidebar menu buttons', () => {
    const page = fixture.nativeElement as HTMLElement;
    const links = [...page.querySelectorAll('a[hlmSidebarMenuButton]')];

    expect(links.some((link) => link.textContent?.includes('Overview'))).toBe(true);
    expect(links.some((link) => link.textContent?.includes('Assessments'))).toBe(true);
    expect(links.some((link) => link.textContent?.includes('Patients'))).toBe(true);
    expect(links.some((link) => link.textContent?.includes('Settings'))).toBe(true);
    expect(page.textContent).not.toContain('Alerts');
  });

  it('hides navigation that the user is not permitted to access', () => {
    permissions.set(
      new Set(
        grantedPermissions.filter(
          (permission) =>
            permission !== 'clinical.beneficiaries.read' &&
            permission !== 'clinical.beneficiaries.create',
        ),
      ),
    );
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    const links = [...page.querySelectorAll('a[hlmSidebarMenuButton]')];

    expect(links.some((link) => link.textContent?.includes('Patients'))).toBe(false);
    expect(links.some((link) => link.textContent?.includes('Assessments'))).toBe(true);
  });

  it('hides assessments when the user cannot read assessment history', () => {
    permissions.update((current) => {
      const next = new Set(current);
      next.delete('clinical.assessments.read');
      return next;
    });
    fixture.detectChanges();

    const links = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('a[hlmSidebarMenuButton]'),
    ];

    expect(links.some((link) => link.textContent?.includes('Assessments'))).toBe(false);
  });
});
