import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
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

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

const defaultProfile: ProfileData = {
  fullName: 'Jane Smith',
  email: 'jane.smith@natabridge.health',
  phone: '+234 800 000 0000',
  role: 'Health coordinator',
};

@Component({
  selector: 'nata-profile',
  imports: [NgIcon, ReactiveFormsModule],
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

  readonly profile = signal<ProfileData>(this.readStoredProfile());
  readonly isEditing = signal(false);
  readonly saved = signal(false);
  readonly emailNotifications = signal(true);
  readonly criticalAlerts = signal(true);
  readonly initials = computed(() =>
    this.profile()
      .fullName.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join(''),
  );

  readonly profileForm = new FormGroup({
    fullName: new FormControl(defaultProfile.fullName, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl(defaultProfile.email, {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl(defaultProfile.phone, { nonNullable: true }),
  });

  constructor() {
    this.profileForm.reset(this.profile());
  }

  startEditing() {
    this.saved.set(false);
    this.profileForm.reset(this.profile());
    this.isEditing.set(true);
  }

  cancelEditing() {
    this.profileForm.reset(this.profile());
    this.isEditing.set(false);
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const updatedProfile: ProfileData = {
      ...this.profile(),
      ...this.profileForm.getRawValue(),
    };

    this.profile.set(updatedProfile);
    sessionStorage.setItem('dashboard_profile', JSON.stringify(updatedProfile));
    this.isEditing.set(false);
    this.saved.set(true);
  }

  logout() {
    void this.authService.logout();
  }

  private readStoredProfile(): ProfileData {
    const storedProfile = sessionStorage.getItem('dashboard_profile');

    if (!storedProfile) return defaultProfile;

    try {
      return { ...defaultProfile, ...(JSON.parse(storedProfile) as Partial<ProfileData>) };
    } catch {
      return defaultProfile;
    }
  }
}
