import { Component, ElementRef, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroArrowLongRight } from '@ng-icons/heroicons/outline';
import { AuthService } from '../../services/auth/auth-service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { fluentWarning } from '@ng-icons/fluent-ui';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { focusFirstInvalidControl } from '../../shared/forms/focus-first-invalid-control';

@Component({
  selector: 'nata-auth',
  imports: [NgIcon, ReactiveFormsModule, MatProgressSpinnerModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
  viewProviders: [provideIcons({ heroArrowLongRight, fluentWarning })],
})
export class Auth {
  private authService = inject(AuthService);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly loading = this.authService.loading;
  readonly errorMessage = this.authService.errorMessage;

  authFormGroup = new FormGroup({
    id: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  login() {
    if (this.loading()) return;

    if (this.authFormGroup.invalid) {
      this.authFormGroup.markAllAsTouched();
      focusFirstInvalidControl(this.authFormGroup, this.host.nativeElement);
      return;
    }

    void this.authService.login({
      id: this.authFormGroup.controls.id.getRawValue(),
      password: this.authFormGroup.controls.password.getRawValue(),
    });
  }
}
