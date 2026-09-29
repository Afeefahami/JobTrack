import { Component, input, output } from '@angular/core';

import { TimelineEvent } from '../../core/models/models';
import { FormatDatePipe, FormatTimePipe } from '../pipes/format.pipes';
import { EVENT_ICON, EVENT_TONE } from '../utils/constants';
import { daysFromToday } from '../utils/date';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-timeline-list',
  imports: [IconComponent, FormatDatePipe, FormatTimePipe],
  template: `
    <ol class="timeline">
      @for (event of events(); track event.id) {
        <li [attr.data-tone]="tone(event)" [class.future]="isFuture(event)">
          <span class="node"><app-icon [name]="icon(event)" [size]="15" /></span>
          <div class="content">
            <div class="head">
              <strong>{{ event.event_type }}</strong>
              @if (isFuture(event)) {
                <span class="chip chip-primary">Upcoming</span>
              }
              @if (editable()) {
                <span class="tools">
                  <button type="button" class="btn-icon" aria-label="Edit event" (click)="edit.emit(event)"><app-icon name="pencil" [size]="15" /></button>
                  <button type="button" class="btn-icon danger" aria-label="Delete event" (click)="remove.emit(event)"><app-icon name="trash" [size]="15" /></button>
                </span>
              }
            </div>
            <div class="when text-sm muted">
              {{ event.event_date | fdate }}@if (event.event_time) { at {{ event.event_time | ftime }}}
            </div>
            @if (event.notes) {
              <p class="notes text-sm">{{ event.notes }}</p>
            }
          </div>
        </li>
      }
    </ol>
  `,
  styles: `
    .timeline { position: relative; display: flex; flex-direction: column; gap: 1.1rem; }
    li { position: relative; display: flex; gap: 0.9rem; }
    li:not(:last-child)::before { content: ''; position: absolute; left: 15px; top: 34px; bottom: -1.1rem; width: 2px; background: var(--border); }
    .node { flex: none; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; color: var(--t); background: color-mix(in srgb, var(--t) 14%, var(--surface)); border: 2px solid var(--surface); box-shadow: 0 0 0 1px color-mix(in srgb, var(--t) 30%, transparent); z-index: 1; }
    .future .node { background: var(--surface); border: 2px dashed var(--t); box-shadow: none; }
    .content { flex: 1; min-width: 0; padding-top: 0.15rem; }
    .head { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .tools { margin-left: auto; display: inline-flex; opacity: 0.6; transition: opacity 0.16s; }
    li:hover .tools, li:focus-within .tools { opacity: 1; }
    .tools .btn-icon { width: 28px; height: 28px; }
    .notes { margin-top: 0.35rem; color: var(--text); white-space: pre-line; overflow-wrap: anywhere; }
  `,
})
export class TimelineListComponent {
  readonly events = input.required<TimelineEvent[]>();
  readonly editable = input(false);
  readonly edit = output<TimelineEvent>();
  readonly remove = output<TimelineEvent>();

  protected tone(event: TimelineEvent): string {
    return EVENT_TONE[event.event_type] ?? 'slate';
  }

  protected icon(event: TimelineEvent): string {
    return EVENT_ICON[event.event_type] ?? 'flag';
  }

  protected isFuture(event: TimelineEvent): boolean {
    return daysFromToday(event.event_date) > 0;
  }
}
