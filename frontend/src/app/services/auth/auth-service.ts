import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, InjectionToken, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  browserSessionPersistence,
  Auth,
  getAuth,
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
import { UserApi, UserRoleApi, UserRoleScope } from '../../models/user/User.api';
import { hasAllPermissions, hasAnyPermission } from '../../core/auth/access';
import { ACTIVE_INSTITUTION_STORAGE_KEY } from '../../core/auth/institution-context';
import { AssessmentService } from '../assessment/assessment-service';

const USER_ROLE_SCOPES: readonly UserRoleScope[] = ['PLATFORM', 'INSTITUTION', 'CLINICAL'];

export const FIREBASE_AUTH = new InjectionToken<Auth>('Firebase Auth', {
  providedIn: 'root',
  factory: () => getAuth(app),
});

@Service()
export class AuthService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly assessmentService = inject(AssessmentService);
  private profileRequest: Promise<UserApi> | null = null;
  private profileUid: string | null = null;

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly user = signal<UserApi | null>(null);
  readonly activeInstitutionId = signal<string | null>(null);
  readonly isUserAuthenticated = computed(() => this.user() !== null);
  readonly clinicianId = computed(() => this.user()?.id ?? null);
  readonly activeRoles = computed(() => {
    const institutionId = this.activeInstitutionId();

    return (
      this.user()?.roles.filter(
        (role) => role.scope === 'PLATFORM' || role.institutionId === institutionId,
      ) ?? []
    );
  });
  readonly roleLabels = computed(() =>
    this.activeRoles().map((role) =>
      role.name
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    ),
  );

  private readonly initialSession = this.auth.authStateReady();

  constructor() {
    this.auth.onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) {
        if (this.profileUid || this.user()) this.clearSession();
        return;
      }

      if (this.profileUid && this.profileUid !== firebaseUser.uid) this.clearSession();
    });
  }

  async waitForSession(): Promise<boolean> {
    await this.initialSession;

    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) return false;

    await this.syncUser(firebaseUser);
    return this.isUserAuthenticated();
  }

  async getIdToken(): Promise<string | null> {
    await this.auth.authStateReady();
    return this.auth.currentUser?.getIdToken() ?? null;
  }

  hasAllPermissions(
    required: readonly string[],
    institutionId: string | null = this.activeInstitutionId(),
  ): boolean {
    return hasAllPermissions(this.user()?.roles ?? [], required, institutionId);
  }

  hasAnyPermission(
    required: readonly string[],
    institutionId: string | null = this.activeInstitutionId(),
  ): boolean {
    return hasAnyPermission(this.user()?.roles ?? [], required, institutionId);
  }

  setActiveInstitution(institutionId: string | null): void {
    this.activeInstitutionId.set(institutionId);

    if (institutionId) {
      sessionStorage.setItem(ACTIVE_INSTITUTION_STORAGE_KEY, institutionId);
    } else {
      sessionStorage.removeItem(ACTIVE_INSTITUTION_STORAGE_KEY);
    }
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
        throw new Error('This Firebase account is not linked to a NataBridge user.');
      }

      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        await signOut(this.auth);
      }
      this.errorMessage.set(this.loginErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.clearSession();
    this.resetContext();
    await this.router.navigateByUrl('/auth');
  }

  async expireSession(message: string): Promise<void> {
    if (!this.auth.currentUser && !this.user()) return;

    try {
      await signOut(this.auth);
    } finally {
      this.clearSession();
      this.errorMessage.set(message);
      await this.router.navigateByUrl('/auth');
    }
  }

  resetContext(): void {
    this.loading.set(false);
    this.errorMessage.set(null);
  }

  private async syncUser(firebaseUser: User | null, reportError = false): Promise<void> {
    if (!firebaseUser) {
      if (this.profileUid) this.clearSession();
      this.profileUid = null;
      this.profileRequest = null;
      this.user.set(null);
      return;
    }

    if (this.profileUid !== firebaseUser.uid) {
      if (this.profileUid) this.clearSession();
      this.user.set(null);
      this.profileUid = firebaseUser.uid;
      this.profileRequest = null;
    }

    if (!this.profileRequest) {
      this.profileRequest = this.loadVerifiedProfile(firebaseUser);
    }

    try {
      const profile = await this.profileRequest;
      if (this.auth.currentUser?.uid === firebaseUser.uid) {
        this.restoreInstitutionContext(profile.roles);
        this.user.set(profile);
      }
    } catch (error) {
      if (this.profileUid === firebaseUser.uid) this.profileRequest = null;
      if (this.auth.currentUser?.uid === firebaseUser.uid) this.user.set(null);
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 401 || error.status === 403) &&
        this.auth.currentUser?.uid === firebaseUser.uid
      ) {
        await signOut(this.auth);
      }
      if (reportError) throw error;
    }
  }

  private async loadVerifiedProfile(firebaseUser: User): Promise<UserApi> {
    const token = await firebaseUser.getIdToken();

    if (!token || this.auth.currentUser?.uid !== firebaseUser.uid) {
      throw new Error('Firebase authentication was not completed.');
    }

    const response = await firstValueFrom(
      this.http.get<ApiResponse<UserApi>>(`${environment.api}/users/me`),
    );
    const profile = response.data;

    if (!this.isCompleteProfile(profile)) {
      throw new Error('The verified user profile is incomplete.');
    }

    return profile;
  }

  private clearSession(): void {
    this.profileUid = null;
    this.profileRequest = null;
    this.user.set(null);
    this.activeInstitutionId.set(null);
    this.assessmentService.clearAssessmentStorage();
    sessionStorage.removeItem('dashboard_profile');
    sessionStorage.removeItem(ACTIVE_INSTITUTION_STORAGE_KEY);
  }

  private restoreInstitutionContext(roles: readonly UserRoleApi[]): void {
    const institutionIds = [
      ...new Set(
        roles
          .map((role) => role.institutionId)
          .filter((institutionId): institutionId is string => Boolean(institutionId)),
      ),
    ];
    const storedInstitutionId = sessionStorage.getItem(ACTIVE_INSTITUTION_STORAGE_KEY);
    const institutionId =
      storedInstitutionId && institutionIds.includes(storedInstitutionId)
        ? storedInstitutionId
        : institutionIds.length === 1
          ? institutionIds[0]
          : null;

    this.activeInstitutionId.set(institutionId);

    if (institutionId) sessionStorage.setItem(ACTIVE_INSTITUTION_STORAGE_KEY, institutionId);
    else sessionStorage.removeItem(ACTIVE_INSTITUTION_STORAGE_KEY);
  }

  private isCompleteProfile(profile: unknown): profile is UserApi {
    if (!profile || typeof profile !== 'object') return false;

    const candidate = profile as Partial<UserApi>;

    return (
      typeof candidate.id === 'string' &&
      Boolean(candidate.id) &&
      typeof candidate.email === 'string' &&
      Boolean(candidate.email) &&
      Array.isArray(candidate.roles) &&
      candidate.roles.every((role) => this.isCompleteRole(role))
    );
  }

  private isCompleteRole(role: unknown): role is UserRoleApi {
    if (!role || typeof role !== 'object') return false;

    const candidate = role as Partial<UserRoleApi>;

    return (
      typeof candidate.id === 'string' &&
      Boolean(candidate.id) &&
      typeof candidate.name === 'string' &&
      Boolean(candidate.name) &&
      typeof candidate.scope === 'string' &&
      USER_ROLE_SCOPES.includes(candidate.scope as UserRoleScope) &&
      (candidate.institutionId === null || typeof candidate.institutionId === 'string') &&
      Array.isArray(candidate.permissions) &&
      candidate.permissions.every(
        (permission) => typeof permission === 'string' && Boolean(permission),
      )
    );
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
      return 'This Firebase account is not linked to an active NataBridge user.';
    }
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return 'Your sign-in session could not be verified. Please sign in again.';
    }
    if (error instanceof Error && error.message.includes('not linked')) return error.message;

    return 'Unable to sign in. Check your connection and try again.';
  }
}
