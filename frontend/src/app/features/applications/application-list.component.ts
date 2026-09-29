import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, debounceTime, map, of, startWith, switchMap, tap } from 'rxjs';

import { Application, ApplicationDetail, ApplicationFilters } from '../../core/models/models';
import { ApplicationService } from '../../core/services/application.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/errors';
import { ApplicationCardComponent } from '../../shared/components/application-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { IconComponent } from '../../shared/components/icon.component';
import { NoteDialogComponent } from '../../shared/components/note-dialog.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { StatusDialogComponent } from '../../shared/components/status-dialog.component';
import { FormatDatePipe } from '../../shared/pipes/format.pipes';
import { APPLICATION_STATUSES, WORK_TYPES } from '../../shared/utils/constants';

type ViewMode = 'grid' | 'table';
const VIEW_KEY = 'jobtrack_view';

@Component({
  selector: 'app-application-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ApplicationCardComponent,
    EmptyStateComponent,
    IconComponent,
    NoteDialogComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
    StatusDialogComponent,
    FormatDatePipe,
  ],
  templateUrl: './application-list.component.html',
  styleUrl: './application-list.component.css',
})
export class ApplicationListComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(ApplicationService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);

  protected readonly statuses = APPLICATION_STATUSES;
  protected readonly workTypes = WORK_TYPES;

  protected readonly applications = signal<Application[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly view = signal<ViewMode>(this.savedView());

  protected readonly statusTarget = signal<Application | null>(null);
  protected readonly noteTarget = signal<Application | null>(null);

  protected readonly form = this.fb.group({
    search: this.fb.control(''),
    status: this.fb.control(this.route.snapshot.queryParamMap.get('status') ?? ''),
    work_type: this.fb.control(''),
    date_from: this.fb.control(''),
    date_to: this.fb.control(''),
    sort: this.fb.control('newest'),
  });

  private readonly filters = signal(this.form.getRawValue());
  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return !!(f.search || f.status || f.work_type || f.date_from || f.date_to);
  });

  constructor() {
    this.form.valueChanges
      .pipe(
        startWith(this.form.getRawValue()),
        map(() => this.form.getRawValue()),
        tap((value) => {
          this.filters.set(value);
          this.loading.set(true);
        }),
        debounceTime(250),
        switchMap((value) =>
          this.api.list(value as ApplicationFilters).pipe(
            catchError((err) => {
              this.error.set(errorMessage(err, 'Unable to load your applications. Please try again.'));
              return of<Application[] | null>(null);
            }),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((list) => {
        this.loading.set(false);
        if (list) {
          this.error.set('');
          this.applications.set(list);
        }
      });
  }

  protected retry(): void {
    this.form.updateValueAndValidity({ emitEvent: true });
  }

  protected clearFilters(): void {
    this.form.reset({ search: '', status: '', work_type: '', date_from: '', date_to: '', sort: this.form.controls.sort.value });
  }

  protected setView(mode: ViewMode): void {
    this.view.set(mode);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  protected onStatusSaved(detail: ApplicationDetail): void {
    this.replace(detail);
    this.statusTarget.set(null);
  }

  protected onNotesSaved(detail: ApplicationDetail): void {
    this.replace(detail);
    this.noteTarget.set(null);
  }

  protected async remove(application: Application): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Delete this application?',
      message: `"${application.job_title}" at ${application.company_name} and its timeline and reminders will be permanently deleted.`,
      confirmText: 'Delete application',
      danger: true,
    });
    if (!confirmed) return;
    this.api.delete(application.id).subscribe({
      next: () => {
        this.applications.update((list) => list.filter((item) => item.id !== application.id));
        this.toast.success('Application deleted.');
      },
      error: (err) => this.toast.error(errorMessage(err, 'Unable to delete the application. Please try again.')),
    });
  }

  private replace(detail: ApplicationDetail): void {
    const { timeline: _timeline, reminders: _reminders, ...application } = detail;
    this.applications.update((list) => list.map((item) => (item.id === application.id ? application : item)));
  }

  private savedView(): ViewMode {
    try {
      return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid';
    } catch {
      return 'grid';
    }
  }
}
