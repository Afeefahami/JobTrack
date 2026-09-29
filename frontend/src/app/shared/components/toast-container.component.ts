import { Component, inject } from '@angular/core';

import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-container',
  imports: [IconComponent],
  template: `
    <div class="toasts" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="toast.type" role="status">
          <app-icon [name]="toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'alert' : 'info'" />
          <span>{{ toast.message }}</span>
          <button type="button" class="btn-icon" aria-label="Dismiss" (click)="toasts.dismiss(toast.id)">
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts { position: fixed; z-index: 300; right: 1rem; bottom: 1rem; display: flex; flex-direction: column; gap: 0.6rem; width: min(380px, calc(100vw - 2rem)); }
    .toast {
      display: flex; align-items: center; gap: 0.7rem; padding: 0.75rem 0.6rem 0.75rem 1rem; border-radius: 12px;
      background: var(--ink); color: #fff; box-shadow: var(--shadow-pop); animation: slide 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
      font-size: 14px;
    }
    :host-context([data-theme='dark']) .toast { background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text); }
    .toast span { flex: 1; }
    .toast .btn-icon { color: inherit; opacity: 0.7; width: 28px; height: 28px; }
    .toast .btn-icon:hover { background: rgba(255,255,255,0.12); color: inherit; opacity: 1; }
    .success app-icon:first-child { color: #5ccb93; }
    .error app-icon:first-child { color: #f08a7c; }
    .info app-icon:first-child { color: #7daef2; }
    @keyframes slide { from { opacity: 0; transform: translateY(12px); } }
  `,
})
export class ToastContainerComponent {
  protected readonly toasts = inject(ToastService);
}
