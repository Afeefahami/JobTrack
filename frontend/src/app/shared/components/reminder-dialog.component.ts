import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Application, Reminder, ReminderType } from '../../core/models/models';
import { ReminderService } from '../../core/services/reminder.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/errors';
import { REMINDER_TYPES } from '../utils/constants';
import { addDaysIso, toTimeInput } from '../utils/date';
import { IconComponent } from './icon.component';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-reminder-dialog',
  imports: [ReactiveFormsModule, ModalComponent, IconComponent],
  template: `
    @if (open()) {
      <app-modal [title]="reminder() ? 'Edit reminder' : 'Add reminder'" (closed)="closed.emit()">
        <form [formGroup]="form" (ngSubmit)="submit()" id="reminder-form" class="stack">
          @if (error()) {
            <div class="alert alert-error"><app-icon name="alert" [size]="16" /><span>{{ error() }}</span></div>
          }
          <div class="field" [class.invalid]="form.controls.title.invalid && form.controls.title.touched">
            <label for="reminder-title">Title <span class="req">*</span></label>
            <input id="reminder-title" type="text" formControlName="title" placeholder="Follow up with the recruiter" maxlength="200" />
            @if (form.controls.title.invalid && form.controls.title.touched) {
              <span class="error">Please enter a title for this reminder.</span>
            }
          </div>
          <div class="field">
            <label for="reminder-type">Type</label>
            <select id="reminder-type" formControlName="type">
              @for (type of types; track type) {
                <option [value]="type">{{ type }}</option>
              }
            </select>
          </div>
          <div class="form-grid">
            <div class="field" [class.invalid]="form.controls.reminder_date.invalid && form.controls.reminder_date.touched">
              <label for="reminder-date">Date <span class="req">*</span></label>
              <input id="reminder-date" type="date" formControlName="reminder_date" />
              @if (form.controls.reminder_date.invalid && form.controls.reminder_date.touched) {
                <span class="error">Please choose a date.</span>
              }
            </div>
            <div class="field">
              <label for="reminder-time">Time (optional)</label>
              <input id="reminder-time" type="time" formControlName="reminder_time" />
            </div>
          </div>
          @if (applications().length && !applicationId()) {
            <div class="field">
              <label for="reminder-app">Application (optional)</label>
              <select id="reminder-app" formControlName="application_id">
                <option value="">Not linked to an application</option>
                @for (app of applications(); track app.id) {
                  <option [value]="app.id">{{ app.job_title }} — {{ app.company_name }}</option>
                }
              </select>
            </div>
          }
          <div class="field">
            <label for="reminder-notes">Notes (optional)</label>
            <textarea id="reminder-notes" rows="3" formControlName="notes"></textarea>
          </div>
        </form>
        <div modal-footer>
          <button type="button" class="btn btn-secondary" (click)="closed.emit()">Cancel</button>
          <button type="submit" form="reminder-form" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) { <span class="spinner"></span> }
            {{ reminder() ? 'Save changes' : 'Add reminder' }}
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class ReminderDialogComponent {
  readonly open = input(false);
  readonly reminder = input<Reminder | null>(null);
  /** Fixed application (used on the details page). */
  readonly applicationId = input<number | null>(null);
  /** Applications to choose from (used on the reminders page). */
  readonly applications = input<Application[]>([]);
  readonly defaultTitle = input('');
  readonly closed = output<void>();
  readonly saved = output<Reminder>();

  protected readonly types = REMINDER_TYPES;
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(ReminderService);
  private readonly toast = inject(ToastService);

  protected readonly form = this.fb.group({
    title: this.fb.control('', [Validators.required, Validators.minLength(2)]),
    type: this.fb.control<ReminderType>('Follow-up'),
    reminder_date: this.fb.control('', Validators.required),
    reminder_time: this.fb.control(''),
    application_id: this.fb.control(''),
    notes: this.fb.control(''),
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const reminder = this.reminder();
      const fixedApplication = this.applicationId();
      const defaultTitle = this.defaultTitle();
      untracked(() => {
        this.error.set('');
        this.form.reset({
          title: reminder?.title ?? defaultTitle,
          type: reminder?.type ?? 'Follow-up',
          reminder_date: reminder?.reminder_date ?? addDaysIso(1),
          reminder_time: toTimeInput(reminder?.reminder_time),
          application_id: String(reminder?.application_id ?? fixedApplication ?? ''),
          notes: reminder?.notes ?? '',
        });
      });
    });
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const value = this.form.getRawValue();
    const applicationId = this.applicationId() ?? (value.application_id ? Number(value.application_id) : null);
    const payload = {
      title: value.title.trim(),
      type: value.type,
      reminder_date: value.reminder_date,
      reminder_time: value.reminder_time || null,
      notes: value.notes.trim() || null,
      application_id: applicationId,
    };
    const existing = this.reminder();
    const request = existing ? this.api.update(existing.id, payload) : this.api.create(payload);

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success(existing ? 'Reminder updated.' : 'Reminder added.');
        this.saved.emit(saved);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Unable to save the reminder. Please try again.'));
      },
    });
  }
}
