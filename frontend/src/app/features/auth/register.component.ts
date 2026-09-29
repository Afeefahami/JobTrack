import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage, fieldErrors } from '../../core/utils/errors';
import { IconComponent } from '../../shared/components/icon.component';
import { AuthLayoutComponent } from './auth-layout.component';
import { fieldsMatch, passwordChecks, strongPassword } from './validators';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  templateUrl: './register.component.html',
  styleUrl: './auth-form.css',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.group(
    {
      full_name: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]),
      email: this.fb.control('', [Validators.required, Validators.email]),
      password: this.fb.control('', [Validators.required, strongPassword]),
      confirm_password: this.fb.control('', Validators.required),
    },
    { validators: fieldsMatch('password', 'confirm_password') },
  );

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  protected readonly checks = computed(() => passwordChecks(this.passwordValue() ?? ''));
  protected readonly level = computed(() => {
    const value = this.passwordValue() ?? '';
    if (!value) return 0;
    return Object.values(this.checks()).filter(Boolean).length;
  });

  protected get name() { return this.form.controls.full_name; }
  protected get email() { return this.form.controls.email; }
  protected get password() { return this.form.controls.password; }
  protected get confirm() { return this.form.controls.confirm_password; }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set('');
    const { full_name, email, password } = this.form.getRawValue();
    this.auth.register(full_name.trim(), email.trim(), password).subscribe({
      next: (user) => {
        this.toast.success(`Welcome to JobTrack, ${user.full_name.split(' ')[0]}.`);
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        const fields = fieldErrors(err);
        this.error.set(
          fields['password'] ?? fields['email'] ?? fields['full_name'] ??
            errorMessage(err, 'Unable to create your account. Please try again.'),
        );
      },
    });
  }
}
