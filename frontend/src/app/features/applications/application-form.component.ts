import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  ApplicationDetail,
  ApplicationPayload,
  ApplicationStatus,
  EmploymentType,
  ExtractedDetails,
  WorkType,
} from '../../core/models/models';
import { ApplicationService } from '../../core/services/application.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage, fieldErrors } from '../../core/utils/errors';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { IconComponent } from '../../shared/components/icon.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { SkillsInputComponent } from '../../shared/components/skills-input.component';
import { APPLICATION_STATUSES, EMPLOYMENT_TYPES, WORK_TYPES } from '../../shared/utils/constants';
import { todayIso } from '../../shared/utils/date';

/** Form fields the extractor can fill, with the label shown in the result summary. */
const EXTRACTABLE: Record<string, string> = {
  job_title: 'Job title',
  company_name: 'Company',
  location: 'Location',
  work_type: 'Work type',
  employment_type: 'Employment type',
  required_skills: 'Skills',
  experience_required: 'Experience',
  salary: 'Salary',
};

const MIN_PASTE_LENGTH = 40;

function optionalUrl(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.includes('.') ? null : { url: true };
  } catch {
    return { url: true };
  }
}

@Component({
  selector: 'app-application-form',
  imports: [ReactiveFormsModule, RouterLink, EmptyStateComponent, IconComponent, PageHeaderComponent, SkillsInputComponent],
  templateUrl: './application-form.component.html',
  styleUrl: './application-form.component.css',
})
export class ApplicationFormComponent {
  /** Route parameter (:id) bound through withComponentInputBinding(); absent when adding. */
  readonly id = input<string>();

  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(ApplicationService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly workTypes = WORK_TYPES;
  protected readonly employmentTypes = EMPLOYMENT_TYPES;
  protected readonly statuses = APPLICATION_STATUSES;

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');
  protected readonly extracting = signal(false);
  protected readonly extractError = signal('');
  protected readonly extractResult = signal<ExtractedDetails | null>(null);
  protected readonly autoFilled = signal<ReadonlySet<string>>(new Set());

  protected readonly form = this.fb.group({
    job_description: this.fb.control(''),
    job_title: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]),
    company_name: this.fb.control('', [Validators.required, Validators.maxLength(200)]),
    location: this.fb.control(''),
    work_type: this.fb.control<WorkType | ''>(''),
    employment_type: this.fb.control<EmploymentType | ''>(''),
    experience_required: this.fb.control(''),
    salary: this.fb.control(''),
    job_url: this.fb.control('', optionalUrl),
    application_date: this.fb.control(todayIso(), Validators.required),
    deadline: this.fb.control(''),
    status: this.fb.control<ApplicationStatus>('Applied'),
    required_skills: this.fb.control<string[]>([]),
    notes: this.fb.control(''),
  });

  protected readonly foundLabels = computed(() => {
    const result = this.extractResult();
    return result ? result.found_fields.map((name) => EXTRACTABLE[name] ?? name) : [];
  });

  constructor() {
    // Editing: load the application once the route id is known.
    effect(() => {
      const id = this.id();
      if (id) this.load(Number(id));
    });

    // When the user edits an auto-filled field, it no longer counts as auto-filled.
    for (const name of Object.keys(EXTRACTABLE)) {
      this.form.get(name)?.valueChanges.subscribe(() => this.unmark(name));
    }
  }

  protected isAuto(name: string): boolean {
    return this.autoFilled().has(name);
  }

  protected invalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected message(name: string): string {
    const control = this.form.get(name);
    if (!control?.errors) return '';
    if (control.errors['server']) return String(control.errors['server']);
    switch (name) {
      case 'job_title':
        return 'Please enter a valid job title.';
      case 'company_name':
        return 'Please enter the company name.';
      case 'job_url':
        return 'Please enter a valid job URL, for example https://company.com/careers/123.';
      case 'application_date':
        return 'Please choose the application date.';
      default:
        return 'Please check this field.';
    }
  }

  protected extract(): void {
    const text = this.form.controls.job_description.value.trim();
    this.extractError.set('');
    this.extractResult.set(null);
    if (text.length < MIN_PASTE_LENGTH) {
      this.extractError.set('Please paste the complete job description so we can read it.');
      return;
    }
    this.extracting.set(true);
    this.api.extract(text).subscribe({
      next: (result) => {
        this.extracting.set(false);
        this.applyExtraction(result);
        this.extractResult.set(result);
      },
      error: () => {
        this.extracting.set(false);
        this.extractError.set('Job description could not be processed. Please review the fields manually.');
      },
    });
  }

  protected save(): void {
    this.form.markAllAsTouched();
    this.saveError.set('');
    if (this.form.invalid || this.saving()) {
      this.saveError.set('Please fix the highlighted fields before saving.');
      return;
    }
    const payload = this.buildPayload();
    this.saving.set(true);
    const id = this.id();
    const request = id ? this.api.update(Number(id), payload) : this.api.create(payload);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success(id ? 'Application updated.' : 'Application saved.');
        void this.router.navigate(id ? ['/applications', saved.id] : ['/applications']);
      },
      error: (err) => {
        this.saving.set(false);
        const fields = fieldErrors(err);
        for (const [name, text] of Object.entries(fields)) {
          this.form.get(name)?.setErrors({ server: text });
        }
        this.saveError.set(errorMessage(err, 'Unable to save application. Please try again.'));
      },
    });
  }

  protected reload(): void {
    const id = this.id();
    if (id) this.load(Number(id));
  }

  private applyExtraction(result: ExtractedDetails): void {
    const filled = new Set<string>();
    const set = (name: string, value: unknown) => {
      this.form.get(name)?.setValue(value as never, { emitEvent: false });
      this.form.get(name)?.markAsDirty();
      filled.add(name);
    };
    if (result.job_title) set('job_title', result.job_title);
    if (result.company_name) set('company_name', result.company_name);
    if (result.location) set('location', result.location);
    if (result.work_type) set('work_type', result.work_type);
    if (result.employment_type) set('employment_type', result.employment_type);
    if (result.experience_required) set('experience_required', result.experience_required);
    if (result.salary) set('salary', result.salary);
    if (result.required_skills.length) set('required_skills', result.required_skills);
    this.autoFilled.set(filled);
  }

  private unmark(name: string): void {
    if (this.autoFilled().has(name)) {
      const next = new Set(this.autoFilled());
      next.delete(name);
      this.autoFilled.set(next);
    }
  }

  private load(id: number): void {
    this.loading.set(true);
    this.loadError.set('');
    this.api.get(id).subscribe({
      next: (application) => {
        this.patch(application);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(errorMessage(err, 'Unable to load this application.'));
      },
    });
  }

  private patch(application: ApplicationDetail): void {
    this.form.reset({
      job_description: application.job_description ?? '',
      job_title: application.job_title,
      company_name: application.company_name,
      location: application.location ?? '',
      work_type: application.work_type ?? '',
      employment_type: application.employment_type ?? '',
      experience_required: application.experience_required ?? '',
      salary: application.salary ?? '',
      job_url: application.job_url ?? '',
      application_date: application.application_date,
      deadline: application.deadline ?? '',
      status: application.status,
      required_skills: application.required_skills,
      notes: application.notes ?? '',
    });
  }

  private buildPayload(): ApplicationPayload {
    const v = this.form.getRawValue();
    const text = (value: string) => value.trim() || null;
    return {
      job_title: v.job_title.trim(),
      company_name: v.company_name.trim(),
      location: text(v.location),
      work_type: v.work_type || null,
      employment_type: v.employment_type || null,
      job_description: text(v.job_description),
      required_skills: v.required_skills,
      experience_required: text(v.experience_required),
      salary: text(v.salary),
      job_url: text(v.job_url),
      application_date: v.application_date,
      deadline: v.deadline || null,
      notes: text(v.notes),
      status: v.status,
    };
  }
}
