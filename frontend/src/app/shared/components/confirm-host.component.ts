import { Component, inject } from '@angular/core';

import { ConfirmService } from '../../core/services/confirm.service';
import { ModalComponent } from './modal.component';

/** Renders the dialog for ConfirmService.confirm(). Placed once in the root component. */
@Component({
  selector: 'app-confirm-host',
  imports: [ModalComponent],
  template: `
    @if (confirm.request(); as request) {
      <app-modal [title]="request.title" [width]="440" (closed)="confirm.answer(false)">
        <p class="muted">{{ request.message }}</p>
        <div modal-footer>
          <button type="button" class="btn btn-secondary" (click)="confirm.answer(false)">
            {{ request.cancelText ?? 'Cancel' }}
          </button>
          <button
            type="button"
            class="btn"
            [class.btn-danger]="request.danger"
            [class.btn-primary]="!request.danger"
            (click)="confirm.answer(true)"
          >
            {{ request.confirmText ?? 'Confirm' }}
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class ConfirmHostComponent {
  protected readonly confirm = inject(ConfirmService);
}
