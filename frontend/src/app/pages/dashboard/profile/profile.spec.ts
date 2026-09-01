import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../../../services/auth/auth-service';
import { Profile } from './profile';

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let logout: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    sessionStorage.removeItem('dashboard_profile');
    logout = vi.fn();

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [{ provide: AuthService, useValue: { logout } }],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('edits and saves profile information for the current session', () => {
    component.startEditing();
    component.profileForm.patchValue({
      fullName: 'Amina Bello',
      email: 'amina@natabridge.health',
    });

    component.saveProfile();

    expect(component.profile().fullName).toBe('Amina Bello');
    expect(component.profile().email).toBe('amina@natabridge.health');
    expect(component.isEditing()).toBe(false);
    expect(JSON.parse(sessionStorage.getItem('dashboard_profile') ?? '{}')).toMatchObject({
      fullName: 'Amina Bello',
    });
  });

  it('signs out through the authentication service', () => {
    component.logout();

    expect(logout).toHaveBeenCalledOnce();
  });
});
