import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../../services/auth/auth-service';
import { Auth } from './auth';

describe('Auth', () => {
  let component: Auth;
  let fixture: ComponentFixture<Auth>;
  let login: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    login = vi.fn();
    await TestBed.configureTestingModule({
      imports: [Auth],
      providers: [
        {
          provide: AuthService,
          useValue: { login, loading: signal(false), errorMessage: signal<string | null>(null) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Auth);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('validates on submit and prevents an incomplete login request', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('#email-error')).toBeNull();

    component.authFormGroup.controls.email.markAsDirty();
    fixture.detectChanges();
    expect(page.querySelector('#email-error')).toBeNull();

    component.login();
    fixture.detectChanges();
    expect(page.querySelector('#email-error')).not.toBeNull();
    expect(page.querySelector('#password-error')).not.toBeNull();
    expect(login).not.toHaveBeenCalled();

    component.authFormGroup.setValue({ email: 'clinician@example.com', password: 'password123' });
    fixture.detectChanges();
    expect(page.querySelector('#email-error')).toBeNull();
    expect(page.querySelector('#password-error')).toBeNull();

    component.login();
    expect(login).toHaveBeenCalledWith({ email: 'clinician@example.com', password: 'password123' });
  });
});
