import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/errors';
import { IconComponent } from '../../shared/components/icon.component';
import { AuthLayoutComponent } from './auth-layout.component';
import { fieldsMatch, passwordChecks, strongPassword } from './validators';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    <app-auth-layout>
      <div class="heading">
        <h1>Choose a new password</h1>
        <p class="muted">Use a password you have not used before.</p>
      </div>

      @if (!token) {
        <div class="alert alert-error"><app-icon name="alert" [size]="16" /><span>This reset link is incomplete. Please request a new one.</span></div>
        <p class="foot"><a routerLink="/forgot-password">Request a new link</a></p>
      } @else {
        @if (error()) {
          <div class="alert alert-error" role="alert" style="margin-bottom: 1rem"><app-icon name="alert" [size]="16" /><span>{{ error() }}</span></div>
        }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field" [class.invalid]="password.invalid && password.touched">
            <label for="password">New password</label>
            <div class="input-with-icon">
              <app-icon name="lock" [size]="18" />
              <input id="password" type="password" formControlName="password" autocomplete="new-password" />
            </div>
            <ul class="rules">
              <li [class.ok]="checks().length"><app-icon [name]="checks().length ? 'check' : 'x'" [size]="13" /> At least 8 characters</li>
              <li [class.ok]="checks().upper"><app-icon [name]="checks().upper ? 'check' : 'x'" [size]="13" /> An uppercase letter</li>
              <li [class.ok]="checks().lower"><app-icon [name]="checks().lower ? 'check' : 'x'" [size]="13" /> A lowercase letter</li>
              <li [class.ok]="checks().digit"><app-icon [name]="checks().digit ? 'check' : 'x'" [size]="13" /> A number</li>
            </ul>
          </div>
          <div class="field" [class.invalid]="form.controls.confirm_password.touched && form.hasError('mismatch')">
            <label for="confirm">Confirm new password</label>
            <div class="input-with-icon">
              <app-icon name="lock" [size]="18" />
              <input id="confirm" type="password" formControlName="confirm_password" autocomplete="new-password" />
            </div>
            @if (form.controls.confirm_password.touched && form.hasError('mismatch')) {
              <span class="error">Passwords do not match.</span>
            }
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block submit" [disabled]="loading()">
            @if (loading()) { <span class="spinner"></span> Saving… } @else { Reset password }
          </button>
        </form>
      }
    </app-auth-layout>
  `,
  styleUrl: './auth-form.css',
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.group(
    {
      password: this.fb.control('', [Validators.required, strongPassword]),
      confirm_password: this.fb.control('', Validators.required),
    },
    { validators: fieldsMatch('password', 'confirm_password') },
  );

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  protected readonly checks = computed(() => passwordChecks(this.passwordValue() ?? ''));

  protected get password() {
    return this.form.controls.password;
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading() || !this.token) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.resetPassword(this.token, this.password.value).subscribe({
      next: () => {
        this.toast.success('Your password has been reset. Please sign in.');
        void this.router.navigateByUrl('/login');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Unable to reset your password. Please request a new link.'));
      },
    });
  }
}
