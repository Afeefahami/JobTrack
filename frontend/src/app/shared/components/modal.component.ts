import { Component, HostListener, OnDestroy, OnInit, input, output } from '@angular/core';

import { IconComponent } from './icon.component';

let nextId = 0;

/**
 * Generic dialog. Render it conditionally (@if) so it only exists while open.
 * Use <div modal-footer> to project footer buttons.
 */
@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  template: `
    <div class="backdrop" (mousedown)="onBackdrop($event)">
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        [style.max-width.px]="width()"
      >
        <header>
          <h2 [id]="titleId">{{ title() }}</h2>
          <button type="button" class="btn-icon" aria-label="Close" (click)="closed.emit()">
            <app-icon name="x" />
          </button>
        </header>
        <div class="body"><ng-content /></div>
        <footer><ng-content select="[modal-footer]" /></footer>
      </div>
    </div>
  `,
  styles: `
    .backdrop {
      position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; padding: 1rem;
      background: rgba(9, 16, 27, 0.55); backdrop-filter: blur(3px); animation: fade 0.18s ease;
    }
    .dialog {
      width: 100%; max-height: min(90vh, 900px); display: flex; flex-direction: column;
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl);
      box-shadow: var(--shadow-float); animation: rise 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.1rem 1.25rem 0.5rem 1.5rem; }
    header h2 { font-size: 1.15rem; }
    .body { padding: 0.75rem 1.5rem 1rem; overflow-y: auto; }
    footer { display: flex; justify-content: flex-end; gap: 0.6rem; padding: 0.9rem 1.5rem 1.25rem; }
    footer:empty { display: none; }
    @keyframes fade { from { opacity: 0; } }
    @keyframes rise { from { opacity: 0; transform: translateY(10px) scale(0.985); } }
    @media (max-width: 560px) {
      .backdrop { align-items: end; padding: 0; }
      .dialog { max-width: none !important; border-radius: var(--radius-xl) var(--radius-xl) 0 0; max-height: 92vh; }
    }
  `,
})
export class ModalComponent implements OnInit, OnDestroy {
  readonly title = input.required<string>();
  readonly width = input(520);
  readonly closed = output<void>();
  protected readonly titleId = `modal-title-${nextId++}`;

  ngOnInit(): void {
    document.body.classList.add('modal-open');
  }

  ngOnDestroy(): void {
    document.body.classList.remove('modal-open');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  protected onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('backdrop')) this.closed.emit();
  }
}
