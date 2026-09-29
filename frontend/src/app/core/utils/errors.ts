import { HttpErrorResponse } from '@angular/common/http';

/** Turns any HTTP failure into a short, friendly message. Raw backend errors are never shown. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to reach the JobTrack server. Please check that the backend is running.';
    }
    const detail = (error.error as { detail?: unknown } | null)?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }
  return fallback;
}

/** Field-level messages from a 422 response: { job_title: "Please enter a valid job title." } */
export function fieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (error instanceof HttpErrorResponse) {
    const list = (error.error as { errors?: { field: string; message: string }[] } | null)?.errors;
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item.field && !(item.field in result)) result[item.field] = item.message;
      }
    }
  }
  return result;
}
