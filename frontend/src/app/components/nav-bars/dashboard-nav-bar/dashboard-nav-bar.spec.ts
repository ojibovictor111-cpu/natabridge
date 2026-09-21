import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { DashboardNavBar } from './dashboard-nav-bar';
import { AuthService } from '../../../services/auth/auth-service';

describe('DashboardNavBar', () => {
  let component: DashboardNavBar;
  let fixture: ComponentFixture<DashboardNavBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardNavBar],
      providers: [
        provideRouter([]),
        { provide: MatDialog, useValue: { open: vi.fn() } },
        {
          provide: AuthService,
          useValue: { user: signal({ id: 'clinician-1', email: 'amina@example.com' }) },
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
    expect(page.querySelector('.sidebar-profile strong')?.textContent).toContain('amina@example.com');
    expect(page.querySelector('.sidebar-profile span')?.textContent).toContain('AM');
  });
});
