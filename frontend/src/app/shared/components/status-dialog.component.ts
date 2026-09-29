import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Application, ApplicationDetail, ApplicationStatus } from '../../core/models/models';
import { ApplicationService } from '../../core/services/application.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/errors';
import { APPLICATION_STATUSES } from '../utils/constants';
import { todayIso } from '../utils/date';
import { IconComponent } from './icon.component';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-status-dialog',
  imports: [ReactiveFormsModule, ModalComponent, IconComponent],
  template: `
    @if (open() && application(); as app) {
      <app-modal title="Update status" (closed)="closed.emit()">
        <form [formGroup]="form" (ngSubmit)="submit(app)" id="status-form" class="stack">
          <p class="muted text-sm">{{ app.job_title }} at {{ app.company_name }}</p>
          @if (error()) {
            <div class="alert alert-error"><app-icon name="alert" [size]="16" /><span>{{ error() }}</span></div>
          }
          <div class="field">
            <label for="status-select">New status</label>
            <select id="status-select" formControlName="status">
              @for (status of statuses; track status) {
                <option [value]="status">{{ status }}</option>
              }
            </select>
            <span class="hint">The change is added to the application's timeline automatically.</span>
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="status-date">Date</label>
              <input id="status-date" type="date" formControlName="event_date" />
            </div>
            <div class="field">
              <label for="status-time">Time (optional)</label>
              <input id="status-time" type="time" formControlName="event_time" />
            </div>
          </div>
          <div class="field">
            <label for="status-note">Note (optional)</label>
            <textarea id="status-note" rows="3" formControlName="note" placeholder="For example: Recruiter emailed with next steps"></textarea>
          </div>
        </form>
        <div modal-footer>
          <button type="button" class="btn btn-secondary" (click)="closed.emit()">Cancel</button>
          <button type="submit" form="status-form" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) { <span class="spinner"></span> }
            Update status
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class StatusDialogComponent {
  readonly open = input(false);
  readonly application = input<Application | null>(null);
  readonly closed = output<void>();
  readonly saved = output<ApplicationDetail>();

  protected readonly statuses = APPLICATION_STATUSES;
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(ApplicationService);
  private readonly toast = inject(ToastService);

  protected readonly form = this.fb.group({
    status: this.fb.control<ApplicationStatus>('Applied', Validators.required),
    event_date: this.fb.control(todayIso(), Validators.required),
    event_time: this.fb.control(''),
    note: this.fb.control(''),
  });

  constructor() {
    effect(() => {
      const app = this.application();
      if (this.open() && app) {
        untracked(() => {
          this.error.set('');
          this.form.reset({ status: app.status, event_date: todayIso(), event_time: '', note: '' });
        });
      }
    });
  }

  protected submit(app: Application): void {
    if (this.form.invalid || this.saving()) return;
    const value = this.form.getRawValue();
    if (value.status === app.status) {
      this.error.set(`This application is already marked as ${app.status}. Choose a different status.`);
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api
      .updateStatus(app.id, {
        status: value.status,
        event_date: value.event_date,
        event_time: value.event_time || null,
        note: value.note || null,
      })
      .subscribe({
        next: (detail) => {
          this.saving.set(false);
          this.toast.success(`Status updated to ${detail.status}.`);
          this.saved.emit(detail);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(errorMessage(err, 'Unable to update the status. Please try again.'));
        },
      });
  }
}
