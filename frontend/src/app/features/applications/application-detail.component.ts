import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ApplicationDetail, Reminder, TimelineEvent } from '../../core/models/models';
import { ApplicationService } from '../../core/services/application.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ReminderService } from '../../core/services/reminder.service';
import { TimelineService } from '../../core/services/timeline.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/errors';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { IconComponent } from '../../shared/components/icon.component';
import { NoteDialogComponent } from '../../shared/components/note-dialog.component';
import { ReminderDialogComponent } from '../../shared/components/reminder-dialog.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { StatusDialogComponent } from '../../shared/components/status-dialog.component';
import { TimelineEventDialogComponent } from '../../shared/components/timeline-event-dialog.component';
import { TimelineListComponent } from '../../shared/components/timeline-list.component';
import { FormatDatePipe, FormatTimePipe, RelativeDayPipe } from '../../shared/pipes/format.pipes';
import { REMINDER_ICON } from '../../shared/utils/constants';
import { daysFromToday } from '../../shared/utils/date';

interface Fact {
  label: string;
  value: string;
  icon: string;
  link?: string;
}

@Component({
  selector: 'app-application-detail',
  imports: [
    RouterLink,
    EmptyStateComponent,
    IconComponent,
    NoteDialogComponent,
    ReminderDialogComponent,
    StatusBadgeComponent,
    StatusDialogComponent,
    TimelineEventDialogComponent,
    TimelineListComponent,
    FormatDatePipe,
    FormatTimePipe,
    RelativeDayPipe,
  ],
  templateUrl: './application-detail.component.html',
  styleUrl: './application-detail.component.css',
})
export class ApplicationDetailComponent {
  readonly id = input.required<string>();

  private readonly api = inject(ApplicationService);
  private readonly timelineApi = inject(TimelineService);
  private readonly reminderApi = inject(ReminderService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly application = signal<ApplicationDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly descriptionExpanded = signal(false);

  protected readonly statusOpen = signal(false);
  protected readonly noteOpen = signal(false);
  protected readonly eventOpen = signal(false);
  protected readonly editingEvent = signal<TimelineEvent | null>(null);
  protected readonly reminderOpen = signal(false);
  protected readonly editingReminder = signal<Reminder | null>(null);

  protected readonly facts = computed<Fact[]>(() => {
    const a = this.application();
    if (!a) return [];
    return [
      { label: 'Company', value: a.company_name, icon: 'building' },
      { label: 'Location', value: a.location ?? '', icon: 'map-pin' },
      { label: 'Work type', value: a.work_type ?? '', icon: 'briefcase' },
      { label: 'Employment type', value: a.employment_type ?? '', icon: 'clock' },
      { label: 'Salary', value: a.salary ?? '', icon: 'award' },
      { label: 'Experience', value: a.experience_required ?? '', icon: 'trending-up' },
    ];
  });

  protected readonly openReminders = computed(() => (this.application()?.reminders ?? []).filter((r) => !r.completed));
  protected readonly doneReminders = computed(() => (this.application()?.reminders ?? []).filter((r) => r.completed));
  protected readonly longDescription = computed(() => (this.application()?.job_description ?? '').length > 700);

  protected readonly deadlineNote = computed(() => {
    const a = this.application();
    if (!a?.deadline) return '';
    const days = daysFromToday(a.deadline);
    if (['Selected', 'Rejected', 'Withdrawn'].includes(a.status)) return '';
    if (days < 0) return 'Deadline passed';
    if (days === 0) return 'Due today';
    return days === 1 ? 'Due tomorrow' : `${days} days left`;
  });

  constructor() {
    effect(() => {
      const id = Number(this.id());
      this.load(id, true);
    });
  }

  protected reload(): void {
    this.load(Number(this.id()), true);
  }

  protected reminderIcon(reminder: Reminder): string {
    return REMINDER_ICON[reminder.type];
  }

  protected isLate(reminder: Reminder): boolean {
    return !reminder.completed && daysFromToday(reminder.reminder_date) < 0;
  }

  protected reminderDefaultTitle(): string {
    const a = this.application();
    return a ? `Follow up with ${a.company_name}` : '';
  }

  // ---- dialogs
  protected openEvent(event: TimelineEvent | null): void {
    this.editingEvent.set(event);
    this.eventOpen.set(true);
  }

  protected openReminder(reminder: Reminder | null): void {
    this.editingReminder.set(reminder);
    this.reminderOpen.set(true);
  }

  protected afterChange(): void {
    this.statusOpen.set(false);
    this.noteOpen.set(false);
    this.eventOpen.set(false);
    this.reminderOpen.set(false);
    this.load(Number(this.id()), false);
  }

  // ---- actions
  protected async deleteApplication(): Promise<void> {
    const a = this.application();
    if (!a) return;
    const ok = await this.confirm.confirm({
      title: 'Delete this application?',
      message: `"${a.job_title}" at ${a.company_name} and its timeline and reminders will be permanently deleted.`,
      confirmText: 'Delete application',
      danger: true,
    });
    if (!ok) return;
    this.api.delete(a.id).subscribe({
      next: () => {
        this.toast.success('Application deleted.');
        void this.router.navigate(['/applications']);
      },
      error: (err) => this.toast.error(errorMessage(err, 'Unable to delete the application. Please try again.')),
    });
  }

  protected async deleteEvent(event: TimelineEvent): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete this timeline event?',
      message: `"${event.event_type}" will be removed from the timeline. The application status will not change.`,
      confirmText: 'Delete event',
      danger: true,
    });
    if (!ok) return;
    this.timelineApi.delete(event.id).subscribe({
      next: () => {
        this.toast.success('Timeline event deleted.');
        this.load(Number(this.id()), false);
      },
      error: (err) => this.toast.error(errorMessage(err, 'Unable to delete the event. Please try again.')),
    });
  }

  protected toggleReminder(reminder: Reminder): void {
    this.reminderApi.setCompleted(reminder.id, !reminder.completed).subscribe({
      next: () => {
        this.toast.success(reminder.completed ? 'Reminder reopened.' : 'Reminder marked as completed.');
        this.load(Number(this.id()), false);
      },
      error: (err) => this.toast.error(errorMessage(err, 'Unable to update the reminder.')),
    });
  }

  protected async deleteReminder(reminder: Reminder): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete this reminder?',
      message: `"${reminder.title}" will be permanently deleted.`,
      confirmText: 'Delete reminder',
      danger: true,
    });
    if (!ok) return;
    this.reminderApi.delete(reminder.id).subscribe({
      next: () => {
        this.toast.success('Reminder deleted.');
        this.load(Number(this.id()), false);
      },
      error: (err) => this.toast.error(errorMessage(err, 'Unable to delete the reminder.')),
    });
  }

  private load(id: number, showLoader: boolean): void {
    if (showLoader) this.loading.set(true);
    this.error.set('');
    this.api.get(id).subscribe({
      next: (application) => {
        this.application.set(application);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Unable to load this application.'));
      },
    });
  }
}
