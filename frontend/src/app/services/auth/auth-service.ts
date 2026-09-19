import { inject, Service, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import { UserApi } from '../../models/user/User.api';
import { Environment as environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from '../../models/api/ApiResponse';
import { AuthCredentials } from '../../models/auth/Auth.ui';

@Service()
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly AUTH_KEY = 'userAuthenticated';
  private readonly CLINICIAN_ID_KEY = 'clinicianId';

  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly user = signal<UserApi | null>(null);

  readonly isUserAuthenticated = signal<boolean>(sessionStorage.getItem(this.AUTH_KEY) === 'true');
  readonly clinicianId = signal(sessionStorage.getItem(this.CLINICIAN_ID_KEY) ?? 'demo-user');

  async login(authCredentials: AuthCredentials) {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set(null);

    this.http
      .post<ApiResponse<UserApi>>(`${environment.api}/users/login`, authCredentials, {
        withCredentials: true,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (resp) => {
          this.user.set(resp.data);
          this.clinicianId.set(authCredentials.id);
          sessionStorage.setItem(this.CLINICIAN_ID_KEY, authCredentials.id);
          this.setAuthenticated(true);

          this.router.navigateByUrl('/dashboard');
        },

        error: (err) => {
          this.setAuthenticated(false);

          this.errorMessage.set(err?.error?.message ?? 'Login failed');
        },
      });
  }

  async logout() {
    this.setAuthenticated(false);
    this.user.set(null);
    this.clinicianId.set('demo-user');
    sessionStorage.removeItem(this.CLINICIAN_ID_KEY);

    this.router.navigateByUrl('/auth');

    this.resetContext();
  }

  private setAuthenticated(value: boolean) {
    this.isUserAuthenticated.set(value);

    if (value) sessionStorage.setItem(this.AUTH_KEY, 'true');
    else sessionStorage.removeItem(this.AUTH_KEY);
  }

  resetContext() {
    this.loading.set(false);
    this.errorMessage.set(null);
  }
}
