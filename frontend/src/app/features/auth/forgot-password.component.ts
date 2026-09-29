import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { errorMessage } from '../../core/utils/errors';
import { IconComponent } from '../../shared/components/icon.component';
import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    <app-auth-layout>
      <div class="heading">
        <h1>Reset your password</h1>
        <p class="muted">Enter your account email and we will generate a reset link.</p>
      </div>

      @if (error()) {
        <div class="alert alert-error" role="alert" style="margin-bottom: 1rem"><app-icon name="alert" [size]="16" /><span>{{ error() }}</span></div>
      }
      @if (message()) {
        <div class="alert alert-success" role="status" style="margin-bottom: 1rem"><app-icon name="check-circle" [size]="16" /><span>{{ message() }}</span></div>
        <p class="text-sm muted">
          JobTrack runs on your own machine and does not send email. The reset link is printed in the terminal where the
          backend is running. Open it in this browser to choose a new password.
        </p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field" [class.invalid]="email.invalid && email.touched">
            <label for="email">Email</label>
            <div class="input-with-icon">
              <app-icon name="mail" [size]="18" />
              <input id="email" type="email" formControlName="email" autocomplete="email" placeholder="you@example.com" />
            </div>
            @if (email.invalid && email.touched) {
              <span class="error">Please enter a valid email address.</span>
            }
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block submit" [disabled]="loading()">
            @if (loading()) { <span class="spinner"></span> Generating link… } @else { Generate reset link }
          </button>
        </form>
      }
      <p class="foot"><a routerLink="/login">Back to Sign In</a></p>
    </app-auth-layout>
  `,
  styleUrl: './auth-form.css',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly form = this.fb.group({ email: this.fb.control('', [Validators.required, Validators.email]) });

  protected get email() {
    return this.form.controls.email;
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.forgotPassword(this.email.value.trim()).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.message.set(response.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Unable to start the reset. Please try again.'));
      },
    });
  }
}
