import { Component, computed, input } from '@angular/core';

import { ApplicationStatus } from '../../core/models/models';
import { STATUS_TONE } from '../utils/constants';

@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [attr.data-tone]="tone()"><span class="dot"></span>{{ status() }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input.required<ApplicationStatus>();
  protected readonly tone = computed(() => STATUS_TONE[this.status()] ?? 'slate');
}
