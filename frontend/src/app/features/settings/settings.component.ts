import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ThemePreference, ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage, fieldErrors } from '../../core/utils/errors';
import { IconComponent } from '../../shared/components/icon.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { FormatDatePipe } from '../../shared/pipes/format.pipes';
import { fieldsMatch, passwordChecks, strongPassword } from '../auth/validators';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, IconComponent, PageHeaderComponent, FormatDatePipe],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly themes: { value: ThemePreference; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'system', label: 'System', icon: 'monitor' },
  ];

  protected readonly profileSaving = signal(false);
  protected readonly profileError = signal('');
  protected readonly passwordSaving = signal(false);
  protected readonly passwordError = signal('');
  protected readonly newPassword = signal('');
  protected readonly checks = computed(() => passwordChecks(this.newPassword()));

  protected readonly profileForm = this.fb.group({
    full_name: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]),
    email: this.fb.control('', [Validators.required, Validators.email]),
  });

  protected readonly passwordForm = this.fb.group(
    {
      current_password: this.fb.control('', Validators.required),
      new_password: this.fb.control('', [Validators.required, strongPassword]),
      confirm_password: this.fb.control('', Validators.required),
    },
    { validators: fieldsMatch('new_password', 'confirm_password') },
  );

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user && this.profileForm.pristine) {
        this.profileForm.reset({ full_name: user.full_name, email: user.email });
      }
    });
    this.passwordForm.controls.new_password.valueChanges.subscribe((value) => this.newPassword.set(value));
  }

  protected saveProfile(): void {
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid || this.profileSaving()) return;
    this.profileSaving.set(true);
    this.profileError.set('');
    const { full_name, email } = this.profileForm.getRawValue();
    this.auth.updateProfile(full_name.trim(), email.trim()).subscribe({
      next: () => {
        this.profileSaving.set(false);
        this.profileForm.markAsPristine();
        this.toast.success('Profile updated.');
      },
      error: (err) => {
        this.profileSaving.set(false);
        const fields = fieldErrors(err);
        this.profileError.set(fields['email'] ?? fields['full_name'] ?? errorMessage(err, 'Unable to update your profile.'));
      },
    });
  }

  protected changePassword(): void {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid || this.passwordSaving()) return;
    this.passwordSaving.set(true);
    this.passwordError.set('');
    const { current_password, new_password } = this.passwordForm.getRawValue();
    this.auth.changePassword(current_password, new_password).subscribe({
      next: () => {
        this.passwordSaving.set(false);
        this.passwordForm.reset({ current_password: '', new_password: '', confirm_password: '' });
        this.toast.success('Your password has been updated.');
      },
      error: (err) => {
        this.passwordSaving.set(false);
        const fields = fieldErrors(err);
        this.passwordError.set(fields['new_password'] ?? errorMessage(err, 'Unable to change your password.'));
      },
    });
  }

  protected async logout(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Log out of JobTrack?',
      message: 'You will need to sign in again to see your applications.',
      confirmText: 'Logout',
    });
    if (ok) this.auth.logout();
  }
}
