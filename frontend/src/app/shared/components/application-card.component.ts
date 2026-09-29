import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Application } from '../../core/models/models';
import { FormatDatePipe } from '../pipes/format.pipes';
import { daysFromToday } from '../utils/date';
import { IconComponent } from './icon.component';
import { StatusBadgeComponent } from './status-badge.component';

const CLOSED = new Set(['Selected', 'Rejected', 'Withdrawn']);

@Component({
  selector: 'app-application-card',
  imports: [RouterLink, IconComponent, StatusBadgeComponent, FormatDatePipe],
  template: `
    <article class="card app-card">
      <header>
        <div class="titles">
          <h3 class="truncate"><a [routerLink]="['/applications', application().id]">{{ application().job_title }}</a></h3>
          <p class="company truncate"><app-icon name="building" [size]="15" />{{ application().company_name }}</p>
        </div>
        <div class="quick">
          @if (application().job_url) {
            <a class="btn-icon" [href]="application().job_url" target="_blank" rel="noopener noreferrer" aria-label="Open original job posting" title="Open job posting">
              <app-icon name="external-link" [size]="17" />
            </a>
          }
          <button type="button" class="btn-icon" aria-label="Add or edit notes" title="Notes" (click)="editNotes.emit(application())">
            <app-icon name="note" [size]="17" />
          </button>
          <button type="button" class="btn-icon danger" aria-label="Delete application" title="Delete" (click)="remove.emit(application())">
            <app-icon name="trash" [size]="17" />
          </button>
        </div>
      </header>

      <div class="meta">
        @if (application().location) {
          <span><app-icon name="map-pin" [size]="15" />{{ application().location }}</span>
        }
        @if (application().work_type) {
          <span><app-icon name="briefcase" [size]="15" />{{ application().work_type }}</span>
        }
      </div>

      <div class="status-row">
        <app-status-badge [status]="application().status" />
        <span class="text-sm muted">Applied {{ application().application_date | fdate }}</span>
      </div>

      @if (deadlineChip(); as chip) {
        <div><span class="chip" [class.chip-accent]="chip.soon" [class.chip-danger]="chip.past"><app-icon name="calendar" [size]="13" />{{ chip.text }}</span></div>
      }

      @if (application().required_skills.length) {
        <div class="skills">
          @for (skill of visibleSkills(); track skill) {
            <span class="chip">{{ skill }}</span>
          }
          @if (extraSkills() > 0) {
            <span class="chip">+{{ extraSkills() }}</span>
          }
        </div>
      }

      @if (application().notes) {
        <p class="notes text-sm muted">{{ application().notes }}</p>
      }

      <footer>
        <a class="btn btn-primary btn-sm" [routerLink]="['/applications', application().id]">View details</a>
        <a class="btn btn-secondary btn-sm" [routerLink]="['/applications', application().id, 'edit']">Edit</a>
        <button type="button" class="btn btn-secondary btn-sm" (click)="updateStatus.emit(application())">Update status</button>
      </footer>
    </article>
  `,
  styles: `
    .app-card { display: flex; flex-direction: column; gap: 0.85rem; height: 100%; transition: border-color 0.16s ease, box-shadow 0.16s ease; }
    .app-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow-pop); }
    header { display: flex; justify-content: space-between; gap: 0.5rem; align-items: flex-start; }
    .titles { min-width: 0; }
    h3 a { color: var(--text); }
    h3 a:hover { color: var(--primary); text-decoration: none; }
    .company { display: flex; align-items: center; gap: 0.4rem; color: var(--text-muted); font-size: 14px; margin-top: 0.15rem; }
    .quick { display: flex; gap: 0.1rem; margin: -0.3rem -0.4rem 0 0; flex: none; }
    .quick .btn-icon { width: 32px; height: 32px; }
    .meta { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; font-size: 13.5px; color: var(--text-muted); }
    .meta span { display: inline-flex; align-items: center; gap: 0.35rem; }
    .status-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .skills { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .notes { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding-left: 0.7rem; border-left: 2px solid var(--border-strong); }
    footer { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: auto; padding-top: 0.25rem; }
  `,
})
export class ApplicationCardComponent {
  readonly application = input.required<Application>();
  readonly updateStatus = output<Application>();
  readonly editNotes = output<Application>();
  readonly remove = output<Application>();

  protected readonly visibleSkills = computed(() => this.application().required_skills.slice(0, 4));
  protected readonly extraSkills = computed(() => Math.max(0, this.application().required_skills.length - 4));

  protected readonly deadlineChip = computed(() => {
    const { deadline, status } = this.application();
    if (!deadline || CLOSED.has(status)) return null;
    const days = daysFromToday(deadline);
    if (days < 0) return { text: 'Deadline passed', soon: false, past: true };
    if (days === 0) return { text: 'Deadline today', soon: true, past: false };
    if (days === 1) return { text: 'Deadline tomorrow', soon: true, past: false };
    return { text: `Deadline in ${days} days`, soon: days <= 3, past: false };
  });
}
