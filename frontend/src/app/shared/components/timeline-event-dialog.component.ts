import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { EventType, TimelineEvent } from '../../core/models/models';
import { ApplicationService } from '../../core/services/application.service';
import { TimelineService } from '../../core/services/timeline.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/errors';
import { EVENT_TYPES } from '../utils/constants';
import { toTimeInput, todayIso } from '../utils/date';
import { IconComponent } from './icon.component';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-timeline-event-dialog',
  imports: [ReactiveFormsModule, ModalComponent, IconComponent],
  template: `
    @if (open()) {
      <app-modal [title]="event() ? 'Edit timeline event' : 'Add timeline event'" (closed)="closed.emit()">
        <form [formGroup]="form" (ngSubmit)="submit()" id="event-form" class="stack">
          @if (error()) {
            <div class="alert alert-error"><app-icon name="alert" [size]="16" /><span>{{ error() }}</span></div>
          }
          <div class="field">
            <label for="event-type">Event type</label>
            <select id="event-type" formControlName="event_type">
              @for (type of eventTypes; track type) {
                <option [value]="type">{{ type }}</option>
              }
            </select>
          </div>
          <div class="form-grid">
            <div class="field" [class.invalid]="form.controls.event_date.invalid && form.controls.event_date.touched">
              <label for="event-date">Date</label>
              <input id="event-date" type="date" formControlName="event_date" />
              @if (form.controls.event_date.invalid && form.controls.event_date.touched) {
                <span class="error">Please choose a valid date.</span>
              }
            </div>
            <div class="field">
              <label for="event-time">Time (optional)</label>
              <input id="event-time" type="time" formControlName="event_time" />
            </div>
          </div>
          <div class="field">
            <label for="event-notes">Notes (optional)</label>
            <textarea id="event-notes" rows="3" formControlName="notes" placeholder="Who you spoke to, what was discussed, what comes next"></textarea>
          </div>
        </form>
        <div modal-footer>
          <button type="button" class="btn btn-secondary" (click)="closed.emit()">Cancel</button>
          <button type="submit" form="event-form" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) { <span class="spinner"></span> }
            {{ event() ? 'Save changes' : 'Add event' }}
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class TimelineEventDialogComponent {
  readonly open = input(false);
  readonly applicationId = input.required<number>();
  readonly event = input<TimelineEvent | null>(null);
  readonly closed = output<void>();
  readonly saved = output<TimelineEvent>();

  protected readonly eventTypes = EVENT_TYPES;
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly applications = inject(ApplicationService);
  private readonly timeline = inject(TimelineService);
  private readonly toast = inject(ToastService);

  protected readonly form = this.fb.group({
    event_type: this.fb.control<EventType>('Follow-up', Validators.required),
    event_date: this.fb.control(todayIso(), Validators.required),
    event_time: this.fb.control(''),
    notes: this.fb.control(''),
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const event = this.event();
      untracked(() => {
        this.error.set('');
        this.form.reset({
          event_type: event?.event_type ?? 'Follow-up',
          event_date: event?.event_date ?? todayIso(),
          event_time: toTimeInput(event?.event_time),
          notes: event?.notes ?? '',
        });
      });
    });
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const value = this.form.getRawValue();
    const payload = {
      event_type: value.event_type,
      event_date: value.event_date,
      event_time: value.event_time || null,
      notes: value.notes.trim() || null,
    };
    const existing = this.event();
    const request = existing
      ? this.timeline.update(existing.id, payload)
      : this.applications.addTimelineEvent(this.applicationId(), payload);

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success(existing ? 'Timeline event updated.' : 'Timeline event added.');
        this.saved.emit(saved);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Unable to save the timeline event. Please try again.'));
      },
    });
  }
}
