import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  browserSessionPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { app } from '../../core/firebase/app';
import { Environment as environment } from '../../environment/environment';
import { ApiResponse } from '../../models/api/ApiResponse';
import { AuthCredentials } from '../../models/auth/Auth.ui';
import { UserApi } from '../../models/user/User.api';
import { AssessmentService } from '../assessment/assessment-service';

@Service()
export class AuthService {
  private readonly auth = getAuth(app);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly assessmentService = inject(AssessmentService);
  private profileRequest: Promise<UserApi> | null = null;
  private profileUid: string | null = null;

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly user = signal<UserApi | null>(null);
  readonly isUserAuthenticated = computed(() => this.user() !== null);
  readonly clinicianId = computed(() => this.user()?.id ?? null);

  private readonly initialSession = this.auth.authStateReady().then(async () => {
    await this.syncUser(this.auth.currentUser);
  });

  constructor() {
    onAuthStateChanged(this.auth, (user) => void this.syncUser(user));
  }

  async waitForSession(): Promise<boolean> {
    await this.initialSession;
    return this.isUserAuthenticated();
  }

  async getIdToken(): Promise<string | null> {
    await this.auth.authStateReady();
    return this.auth.currentUser?.getIdToken() ?? null;
  }

  async login(credentials: AuthCredentials): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      await setPersistence(this.auth, browserSessionPersistence);
      const { user } = await signInWithEmailAndPassword(
        this.auth,
        credentials.email.trim(),
        credentials.password,
      );
      await this.syncUser(user, true);

      if (!this.isUserAuthenticated()) {
        await signOut(this.auth);
        throw new Error('This Firebase account is not linked to a NataBridge clinician.');
      }

      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 403) {
        await signOut(this.auth);
      }
      this.errorMessage.set(this.loginErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.user.set(null);
    this.assessmentService.clearAssessmentStorage();
    sessionStorage.removeItem('dashboard_profile');
    this.resetContext();
    await this.router.navigateByUrl('/auth');
  }

  resetContext(): void {
    this.loading.set(false);
    this.errorMessage.set(null);
  }

  private async syncUser(firebaseUser: User | null, reportError = false): Promise<void> {
    if (!firebaseUser) {
      this.profileUid = null;
      this.profileRequest = null;
      this.user.set(null);
      return;
    }

    if (this.profileUid !== firebaseUser.uid || !this.profileRequest) {
      this.profileUid = firebaseUser.uid;
      this.profileRequest = firstValueFrom(
        this.http.get<ApiResponse<UserApi>>(`${environment.api}/users/me`),
      ).then((response) => response.data);
    }

    try {
      const profile = await this.profileRequest;
      if (this.auth.currentUser?.uid === firebaseUser.uid) this.user.set(profile);
    } catch (error) {
      this.profileRequest = null;
      if (this.auth.currentUser?.uid === firebaseUser.uid) this.user.set(null);
      if (reportError) throw error;
    }
  }

  private loginErrorMessage(error: unknown): string {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;

    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/user-not-found' ||
      code === 'auth/wrong-password'
    ) {
      return 'The email or password is incorrect.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Please wait and try again.';
    }
    if (error instanceof HttpErrorResponse && error.status === 403) {
      return 'This Firebase account is not linked to an active NataBridge clinician.';
    }
    if (error instanceof Error && error.message.includes('not linked')) return error.message;

    return 'Unable to sign in. Check your connection and try again.';
  }
}
