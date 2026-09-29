import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Application,
  ApplicationDetail,
  ApplicationFilters,
  ApplicationPayload,
  ExtractedDetails,
  StatusUpdatePayload,
  TimelineEvent,
  TimelineEventPayload,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/applications`;

  list(filters: ApplicationFilters = {}): Observable<Application[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<Application[]>(this.api, { params });
  }

  get(id: number): Observable<ApplicationDetail> {
    return this.http.get<ApplicationDetail>(`${this.api}/${id}`);
  }

  create(payload: ApplicationPayload): Observable<ApplicationDetail> {
    return this.http.post<ApplicationDetail>(this.api, payload);
  }

  update(id: number, payload: ApplicationPayload): Observable<ApplicationDetail> {
    return this.http.put<ApplicationDetail>(`${this.api}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  updateStatus(id: number, payload: StatusUpdatePayload): Observable<ApplicationDetail> {
    return this.http.patch<ApplicationDetail>(`${this.api}/${id}/status`, payload);
  }

  extract(text: string): Observable<ExtractedDetails> {
    return this.http.post<ExtractedDetails>(`${this.api}/extract`, { text });
  }

  addTimelineEvent(id: number, payload: TimelineEventPayload): Observable<TimelineEvent> {
    return this.http.post<TimelineEvent>(`${this.api}/${id}/timeline`, payload);
  }
}

/** Builds an update payload from an existing application (used for quick edits such as notes). */
export function toPayload(application: Application, overrides: Partial<ApplicationPayload> = {}): ApplicationPayload {
  return {
    job_title: application.job_title,
    company_name: application.company_name,
    location: application.location,
    work_type: application.work_type,
    employment_type: application.employment_type,
    job_description: application.job_description,
    required_skills: application.required_skills,
    experience_required: application.experience_required,
    salary: application.salary,
    job_url: application.job_url,
    application_date: application.application_date,
    deadline: application.deadline,
    notes: application.notes,
    ...overrides,
  };
}
