import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from './icon.component';

@Component({
  selector: 'app-empty-state',
  imports: [IconComponent, RouterLink],
  template: `
    <div class="empty" [class.compact]="compact()">
      <div class="art"><app-icon [name]="icon()" [size]="compact() ? 22 : 28" [stroke]="1.5" /></div>
      <h3>{{ title() }}</h3>
      <p class="muted">{{ message() }}</p>
      @if (actionLabel()) {
        @if (actionLink()) {
          <a class="btn btn-primary" [routerLink]="actionLink()">{{ actionLabel() }}</a>
        } @else {
          <button type="button" class="btn btn-primary" (click)="action.emit()">{{ actionLabel() }}</button>
        }
      }
      <ng-content />
    </div>
  `,
  styles: `
    .empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.6rem; padding: 3rem 1.25rem; }
    .empty.compact { padding: 1.5rem 1rem; gap: 0.4rem; }
    .empty p { max-width: 36ch; }
    .art { width: 60px; height: 60px; display: grid; place-items: center; border-radius: 18px; background: var(--primary-soft); color: var(--primary); margin-bottom: 0.4rem; }
    .compact .art { width: 44px; height: 44px; border-radius: 13px; }
    .btn { margin-top: 0.8rem; }
  `,
})
export class EmptyStateComponent {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly message = input('');
  readonly actionLabel = input('');
  readonly actionLink = input<string | null>(null);
  readonly compact = input(false);
  readonly action = output<void>();
}
