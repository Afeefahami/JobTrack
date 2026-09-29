import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { Application, ApplicationDetail } from '../../core/models/models';
import { ApplicationService, toPayload } from '../../core/services/application.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/errors';
import { IconComponent } from './icon.component';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-note-dialog',
  imports: [ReactiveFormsModule, ModalComponent, IconComponent],
  template: `
    @if (open() && application(); as app) {
      <app-modal title="Notes" (closed)="closed.emit()">
        <form [formGroup]="form" (ngSubmit)="submit(app)" id="note-form" class="stack">
          <p class="muted text-sm">{{ app.job_title }} at {{ app.company_name }}</p>
          @if (error()) {
            <div class="alert alert-error"><app-icon name="alert" [size]="16" /><span>{{ error() }}</span></div>
          }
          <div class="field">
            <label for="note-text" class="sr-only">Notes</label>
            <textarea id="note-text" rows="7" formControlName="notes" maxlength="10000" placeholder="Contacts, interview prep, salary discussion, anything worth remembering"></textarea>
          </div>
        </form>
        <div modal-footer>
          <button type="button" class="btn btn-secondary" (click)="closed.emit()">Cancel</button>
          <button type="submit" form="note-form" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) { <span class="spinner"></span> }
            Save notes
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class NoteDialogComponent {
  readonly open = input(false);
  readonly application = input<Application | null>(null);
  readonly closed = output<void>();
  readonly saved = output<ApplicationDetail>();

  protected readonly saving = signal(false);
  protected readonly error = signal('');

  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(ApplicationService);
  private readonly toast = inject(ToastService);

  protected readonly form = this.fb.group({ notes: this.fb.control('') });

  constructor() {
    effect(() => {
      const app = this.application();
      if (this.open() && app) {
        untracked(() => {
          this.error.set('');
          this.form.reset({ notes: app.notes ?? '' });
        });
      }
    });
  }

  protected submit(app: Application): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const notes = this.form.getRawValue().notes.trim() || null;
    this.api.update(app.id, toPayload(app, { notes })).subscribe({
      next: (detail) => {
        this.saving.set(false);
        this.toast.success('Notes saved.');
        this.saved.emit(detail);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Unable to save your notes. Please try again.'));
      },
    });
  }
}
