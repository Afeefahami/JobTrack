import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TimelineFeedItem } from '../../core/models/models';
import { TimelineService } from '../../core/services/timeline.service';
import { errorMessage } from '../../core/utils/errors';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { IconComponent } from '../../shared/components/icon.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { FormatDatePipe, FormatTimePipe } from '../../shared/pipes/format.pipes';
import { EVENT_ICON, EVENT_TONE } from '../../shared/utils/constants';
import { daysFromToday, parseDate } from '../../shared/utils/date';

type Scope = 'all' | 'upcoming' | 'past';
interface Group {
  label: string;
  items: TimelineFeedItem[];
}

@Component({
  selector: 'app-timeline-page',
  imports: [FormsModule, RouterLink, EmptyStateComponent, IconComponent, PageHeaderComponent, FormatDatePipe, FormatTimePipe],
  template: `
    <app-page-header title="Timeline" subtitle="Every status change, interview and follow-up across your applications." />

    <div class="toolbar">
      <div class="scopes" role="tablist" aria-label="Show">
        @for (option of scopes; track option.value) {
          <button type="button" role="tab" [attr.aria-selected]="scope() === option.value" [class.on]="scope() === option.value" (click)="scope.set(option.value)">{{ option.label }}</button>
        }
      </div>
      <div class="input-with-icon search">
        <app-icon name="search" [size]="17" />
        <input type="search" [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Filter by job or company" aria-label="Filter timeline" />
      </div>
    </div>

    @if (loading()) {
      <div class="skeleton" style="height: 320px"></div>
    } @else if (error()) {
      <div class="card"><app-empty-state icon="alert" title="Timeline unavailable" [message]="error()" actionLabel="Try again" (action)="load()" /></div>
    } @else if (items().length === 0) {
      <div class="card"><app-empty-state icon="timeline" title="No timeline events yet" message="Events appear here when you add applications and change their status." actionLabel="+ Add Application" actionLink="/applications/new" /></div>
    } @else if (groups().length === 0) {
      <div class="card"><app-empty-state icon="search" title="No events found." message="Try a different filter or search." /></div>
    } @else {
      @for (group of groups(); track group.label) {
        <section class="group">
          <h2 class="group-title">{{ group.label }}</h2>
          <div class="card list">
            @for (item of group.items; track item.id) {
              <a class="entry" [routerLink]="['/applications', item.application_id]" [attr.data-tone]="tone(item)">
                <span class="node"><app-icon [name]="icon(item)" [size]="17" /></span>
                <span class="main">
                  <strong>{{ item.event_type }}</strong>
                  <span class="text-sm muted">{{ item.job_title }} · {{ item.company_name }}</span>
                  @if (item.notes) { <span class="text-sm note">{{ item.notes }}</span> }
                </span>
                <span class="when">{{ item.event_date | fdate: 'short' }}@if (item.event_time) { <small>{{ item.event_time | ftime }}</small> }</span>
              </a>
            }
          </div>
        </section>
      }
    }
  `,
  styles: `
    .toolbar { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
    .scopes { display: inline-flex; padding: 3px; border-radius: 11px; background: var(--surface-3); }
    .scopes button { border: 0; background: transparent; padding: 0.42rem 0.95rem; border-radius: 8px; font-weight: 600; font-size: 14px; color: var(--text-muted); }
    .scopes button.on { background: var(--surface); color: var(--primary); box-shadow: 0 1px 3px rgba(15, 27, 45, 0.15); }
    .search { width: min(320px, 100%); }
    .group { margin-bottom: 1.5rem; }
    .group-title { font-size: 0.95rem; color: var(--text-muted); margin-bottom: 0.6rem; font-weight: 600; }
    .list { padding: 0.4rem 0.6rem; }
    .entry { display: flex; align-items: flex-start; gap: 0.9rem; padding: 0.8rem 0.5rem; border-top: 1px solid var(--border); color: var(--text); border-radius: 10px; }
    .entry:first-child { border-top: 0; }
    .entry:hover { background: var(--surface-2); text-decoration: none; }
    .node { flex: none; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; color: var(--t); background: color-mix(in srgb, var(--t) 14%, var(--surface)); }
    .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .note { margin-top: 0.2rem; color: var(--text); overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .when { flex: none; text-align: right; font-weight: 600; font-size: 13.5px; display: flex; flex-direction: column; }
    .when small { font-weight: 500; color: var(--text-muted); font-size: 12px; }
  `,
})
export class TimelinePageComponent {
  private readonly api = inject(TimelineService);

  protected readonly scopes: { value: Scope; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
  ];
  protected readonly items = signal<TimelineFeedItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly scope = signal<Scope>('all');
  protected readonly query = signal('');

  protected readonly groups = computed<Group[]>(() => {
    const term = this.query().trim().toLowerCase();
    const scope = this.scope();
    const filtered = this.items().filter((item) => {
      const upcoming = daysFromToday(item.event_date) >= 0;
      if (scope === 'upcoming' && !upcoming) return false;
      if (scope === 'past' && upcoming) return false;
      return !term || `${item.job_title} ${item.company_name}`.toLowerCase().includes(term);
    });

    const upcoming = filtered
      .filter((item) => daysFromToday(item.event_date) >= 0)
      .sort((a, b) => (a.event_date + (a.event_time ?? '')).localeCompare(b.event_date + (b.event_time ?? '')));
    const groups: Group[] = upcoming.length ? [{ label: 'Upcoming', items: upcoming }] : [];

    const byMonth = new Map<string, TimelineFeedItem[]>();
    for (const item of filtered.filter((i) => daysFromToday(i.event_date) < 0)) {
      const label = parseDate(item.event_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      byMonth.set(label, [...(byMonth.get(label) ?? []), item]);
    }
    for (const [label, list] of byMonth) groups.push({ label, items: list });
    return groups;
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.feed().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Unable to load the timeline. Please try again.'));
      },
    });
  }

  protected tone(item: TimelineFeedItem): string {
    return EVENT_TONE[item.event_type];
  }

  protected icon(item: TimelineFeedItem): string {
    return EVENT_ICON[item.event_type];
  }
}
