import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DashboardStats } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ReminderService } from '../../core/services/reminder.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/errors';
import { ChartComponent } from '../../shared/components/chart.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { IconComponent } from '../../shared/components/icon.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { FormatDatePipe, FormatTimePipe, RelativeDayPipe } from '../../shared/pipes/format.pipes';
import { EVENT_ICON, EVENT_TONE, REMINDER_ICON, STATUS_TONE } from '../../shared/utils/constants';
import { greeting } from '../../shared/utils/date';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  tone: string;
  hint: string;
  link: string;
  query?: Record<string, string>;
  featured?: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    ChartComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
    FormatDatePipe,
    FormatTimePipe,
    RelativeDayPipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly api = inject(DashboardService);
  private readonly reminderApi = inject(ReminderService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly title = computed(() => {
    const name = this.auth.firstName();
    return name ? `${greeting()}, ${name}` : greeting();
  });

  protected readonly cards = computed<StatCard[]>(() => {
    const s = this.stats()?.summary;
    if (!s) return [];
    return [
      { label: 'Total Applications', value: s.total, icon: 'briefcase', tone: 'teal', hint: 'Everything you are tracking', link: '/applications', featured: true },
      { label: 'Applied', value: s.applied, icon: 'send', tone: 'slate', hint: 'Waiting to hear back', link: '/applications', query: { status: 'Applied' } },
      { label: 'Under Review', value: s.under_review, icon: 'eye', tone: 'amber', hint: `${s.shortlisted} shortlisted`, link: '/applications', query: { status: 'Under Review' } },
      { label: 'Interviews', value: s.interviews, icon: 'video', tone: 'blue', hint: 'Interview, technical or HR round', link: '/applications' },
      { label: 'Offers', value: s.offers, icon: 'award', tone: 'green', hint: 'Offer or selected', link: '/applications' },
      { label: 'Rejected', value: s.rejected, icon: 'x-circle', tone: 'red', hint: `${s.withdrawn} withdrawn`, link: '/applications', query: { status: 'Rejected' } },
    ];
  });

  private readonly nonZeroStatuses = computed(() => (this.stats()?.by_status ?? []).filter((row) => row.count > 0));
  protected readonly statusLabels = computed(() => this.nonZeroStatuses().map((row) => row.status));
  protected readonly statusValues = computed(() => this.nonZeroStatuses().map((row) => row.count));
  protected readonly statusColors = computed(() =>
    this.nonZeroStatuses().map((row) => `--tone-${STATUS_TONE[row.status]}`),
  );
  protected readonly timeLabels = computed(() => (this.stats()?.applications_over_time ?? []).map((row) => row.label));
  protected readonly timeValues = computed(() => (this.stats()?.applications_over_time ?? []).map((row) => row.count));
  protected readonly funnelLabels = computed(() => (this.stats()?.funnel ?? []).map((row) => row.stage));
  protected readonly funnelValues = computed(() => (this.stats()?.funnel ?? []).map((row) => row.count));
  protected readonly funnelColors = ['--tone-slate', '--tone-amber', '--tone-violet', '--tone-blue', '--tone-green'];
  protected readonly interviewLabels = computed(() => (this.stats()?.interviews_over_time ?? []).map((row) => row.label));
  protected readonly interviewValues = computed(() => (this.stats()?.interviews_over_time ?? []).map((row) => row.count));
  protected readonly totalInterviewEvents = computed(() => this.interviewValues().reduce((a, b) => a + b, 0));

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.stats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Unable to load your dashboard. Please try again.'));
      },
    });
  }

  protected complete(id: number): void {
    this.reminderApi.setCompleted(id, true).subscribe({
      next: () => {
        this.toast.success('Reminder marked as completed.');
        this.api.stats().subscribe((stats) => this.stats.set(stats));
      },
      error: (err) => this.toast.error(errorMessage(err, 'Unable to update the reminder.')),
    });
  }

  protected eventIcon(type: keyof typeof EVENT_ICON): string {
    return EVENT_ICON[type];
  }

  protected eventTone(type: keyof typeof EVENT_TONE): string {
    return EVENT_TONE[type];
  }

  protected reminderIcon(type: keyof typeof REMINDER_ICON): string {
    return REMINDER_ICON[type];
  }
}
