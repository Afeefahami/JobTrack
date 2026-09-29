import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Application, Reminder } from '../../core/models/models';
import { ApplicationService } from '../../core/services/application.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ReminderService } from '../../core/services/reminder.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/errors';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { IconComponent } from '../../shared/components/icon.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { ReminderDialogComponent } from '../../shared/components/reminder-dialog.component';
import { FormatTimePipe, RelativeDayPipe } from '../../shared/pipes/format.pipes';
import { REMINDER_ICON } from '../../shared/utils/constants';
import { daysFromToday } from '../../shared/utils/date';

interface Section {
  key: string;
  title: string;
  tone: 'late' | 'today' | 'later';
  items: Reminder[];
}

@Component({
  selector: 'app-reminders-page',
  imports: [RouterLink, EmptyStateComponent, IconComponent, PageHeaderComponent, ReminderDialogComponent, FormatTimePipe, RelativeDayPipe],
  templateUrl: './reminders-page.component.html',
  styleUrl: './reminders-page.component.css',
})
export class RemindersPageComponent {
  private readonly api = inject(ReminderService);
  private readonly applicationApi = inject(ApplicationService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly reminders = signal<Reminder[]>([]);
  protected readonly applications = signal<Application[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly showCompleted = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Reminder | null>(null);

  protected readonly sections = computed<Section[]>(() => {
    const open = this.reminders().filter((r) => !r.completed);
    const overdue = open.filter((r) => daysFromToday(r.reminder_date) < 0);
    const today = open.filter((r) => daysFromToday(r.reminder_date) === 0);
    const later = open.filter((r) => daysFromToday(r.reminder_date) > 0);
    return [
      { key: 'overdue', title: 'Overdue', tone: 'late' as const, items: overdue },
      { key: 'today', title: 'Today', tone: 'today' as const, items: today },
      { key: 'later', title: 'Upcoming', tone: 'later' as const, items: later },
    ].filter((section) => section.items.length > 0);
  });

  protected readonly completed = computed(() => this.reminders().filter((r) => r.completed).reverse());
  protected readonly openCount = computed(() => this.reminders().filter((r) => !r.completed).length);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ reminders: this.api.list(), applications: this.applicationApi.list({ sort: 'company' }) }).subscribe({
      next: ({ reminders, applications }) => {
        this.reminders.set(reminders);
        this.applications.set(applications);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Unable to load your reminders. Please try again.'));
      },
    });
  }

  protected icon(reminder: Reminder): string {
    return REMINDER_ICON[reminder.type];
  }

  protected openDialog(reminder: Reminder | null): void {
    this.editing.set(reminder);
    this.dialogOpen.set(true);
  }

  protected onSaved(): void {
    this.dialogOpen.set(false);
    this.load();
  }

  protected toggle(reminder: Reminder): void {
    this.api.setCompleted(reminder.id, !reminder.completed).subscribe({
      next: (updated) => {
        this.reminders.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
        this.toast.success(updated.completed ? 'Reminder marked as completed.' : 'Reminder reopened.');
      },
      error: (err) => this.toast.error(errorMessage(err, 'Unable to update the reminder.')),
    });
  }

  protected async remove(reminder: Reminder): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete this reminder?',
      message: `"${reminder.title}" will be permanently deleted.`,
      confirmText: 'Delete reminder',
      danger: true,
    });
    if (!ok) return;
    this.api.delete(reminder.id).subscribe({
      next: () => {
        this.reminders.update((list) => list.filter((r) => r.id !== reminder.id));
        this.toast.success('Reminder deleted.');
      },
      error: (err) => this.toast.error(errorMessage(err, 'Unable to delete the reminder.')),
    });
  }
}
