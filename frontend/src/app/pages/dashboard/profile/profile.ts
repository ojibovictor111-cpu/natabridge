import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import {
  lucideBell,
  lucideCheck,
  lucideEdit3,
  lucideLogOut,
  lucideMail,
  lucidePhone,
  lucideShieldCheck,
  lucideUserRound,
  lucideX,
} from '@ng-icons/lucide';
import { AuthService } from '../../../services/auth/auth-service';
import { focusFirstInvalidControl } from '../../../shared/forms/focus-first-invalid-control';

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

@Component({
  selector: 'nata-profile',
  imports: [
    NgIcon,
    ReactiveFormsModule,
    ...HlmAvatarImports,
    ...HlmButtonImports,
    ...HlmInputImports,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  viewProviders: [
    provideIcons({
      lucideBell,
      lucideCheck,
      lucideEdit3,
      lucideLogOut,
      lucideMail,
      lucidePhone,
      lucideShieldCheck,
      lucideUserRound,
      lucideX,
    }),
  ],
})
export class Profile {
  private readonly authService = inject(AuthService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly profile = signal<ProfileData>(this.readStoredProfile());
  readonly isEditing = signal(false);
  readonly saved = signal(false);
  readonly submitted = signal(false);
  readonly emailNotifications = signal(true);
  readonly criticalAlerts = signal(true);
  readonly initials = computed(() =>
    (this.profile().fullName.trim() || this.profile().email.split('@')[0])
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join(''),
  );

  readonly profileForm = new FormGroup({
    fullName: new FormControl(this.profile().fullName, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl(this.profile().email, {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl(this.profile().phone, { nonNullable: true }),
  });

  constructor() {
    this.profileForm.reset(this.profile());
  }

  startEditing() {
    this.saved.set(false);
    this.submitted.set(false);
    this.profileForm.reset(this.profile());
    this.isEditing.set(true);
  }

  cancelEditing() {
    this.submitted.set(false);
    this.profileForm.reset(this.profile());
    this.isEditing.set(false);
  }

  saveProfile() {
    this.submitted.set(true);
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      focusFirstInvalidControl(this.profileForm, this.host.nativeElement);
      return;
    }

    const updatedProfile: ProfileData = {
      ...this.profile(),
      ...this.profileForm.getRawValue(),
      email: this.authService.user()?.email ?? this.profile().email,
    };

    this.profile.set(updatedProfile);
    sessionStorage.setItem(
      'dashboard_profile',
      JSON.stringify({
        userId: this.authService.user()?.id,
        fullName: updatedProfile.fullName,
        phone: updatedProfile.phone,
      }),
    );
    this.isEditing.set(false);
    this.saved.set(true);
  }

  logout() {
    void this.authService.logout();
  }

  private readStoredProfile(): ProfileData {
    const user = this.authService.user();
    const profile: ProfileData = {
      fullName: '',
      email: user?.email ?? '',
      phone: '',
      role: this.authService.roleLabels().join(', ') || 'User',
    };
    const storedProfile = sessionStorage.getItem('dashboard_profile');

    if (!storedProfile || !user) return profile;

    try {
      const stored = JSON.parse(storedProfile) as Partial<ProfileData> & { userId?: string };
      if (stored.userId !== user.id) return profile;
      return {
        ...profile,
        fullName: typeof stored.fullName === 'string' ? stored.fullName : '',
        phone: typeof stored.phone === 'string' ? stored.phone : '',
      };
    } catch {
      return profile;
    }
  }
}
