import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TimelineEvent, TimelineEventPayload, TimelineFeedItem } from '../models/models';

@Injectable({ providedIn: 'root' })
export class TimelineService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/timeline`;

  feed(): Observable<TimelineFeedItem[]> {
    return this.http.get<TimelineFeedItem[]>(this.api);
  }

  update(id: number, payload: TimelineEventPayload): Observable<TimelineEvent> {
    return this.http.put<TimelineEvent>(`${this.api}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
