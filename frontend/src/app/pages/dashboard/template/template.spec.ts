import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { Template } from './template';
import { AuthService } from '../../../services/auth/auth-service';
import { HlmSidebarService } from '@spartan-ng/helm/sidebar';

describe('Template', () => {
  let component: Template;
  let fixture: ComponentFixture<Template>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Template],
      providers: [
        provideRouter([]),
        { provide: MatDialog, useValue: { open: vi.fn() } },
        {
          provide: AuthService,
          useValue: {
            user: signal({ id: 'clinician-1', email: 'amina@example.com', roles: [] }),
            roleLabels: signal(['Clinician']),
            hasAllPermissions: () => true,
            hasAnyPermission: () => true,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Template);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the Spartan sidebar shell and trigger', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('hlm-sidebar')).toBeTruthy();
    expect(page.querySelector('[hlmSidebarWrapper]')).toBeTruthy();
    expect(page.querySelector('button[hlmSidebarTrigger]')).toBeTruthy();
  });

  it('renders the clinician initials with the Spartan avatar', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('a[aria-label="Open profile settings"] hlm-avatar')).toBeTruthy();
    expect(page.querySelector('[hlmAvatarFallback]')?.textContent).toContain('AM');
  });

  it('toggles the Spartan sidebar from the header button', () => {
    const sidebar = fixture.debugElement.injector.get(HlmSidebarService);
    const initialState = sidebar.state();
    const trigger = fixture.nativeElement.querySelector(
      'button[hlmSidebarTrigger]',
    ) as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();

    expect(sidebar.state()).not.toBe(initialState);
  });
});
