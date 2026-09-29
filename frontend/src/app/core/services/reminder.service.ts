import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Reminder, ReminderPayload } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/reminders`;

  list(options: { completed?: boolean; applicationId?: number } = {}): Observable<Reminder[]> {
    let params = new HttpParams();
    if (options.completed !== undefined) params = params.set('completed', options.completed);
    if (options.applicationId !== undefined) params = params.set('application_id', options.applicationId);
    return this.http.get<Reminder[]>(this.api, { params });
  }

  create(payload: ReminderPayload): Observable<Reminder> {
    return this.http.post<Reminder>(this.api, payload);
  }

  update(id: number, payload: Partial<ReminderPayload> & { completed?: boolean }): Observable<Reminder> {
    return this.http.put<Reminder>(`${this.api}/${id}`, payload);
  }

  setCompleted(id: number, completed: boolean): Observable<Reminder> {
    return this.update(id, { completed });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
