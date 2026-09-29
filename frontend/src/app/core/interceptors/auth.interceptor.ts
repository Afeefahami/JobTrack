import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/** Attaches the JWT to API requests and signs the user out when the API says the session is invalid. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isApiCall = request.url.startsWith(environment.apiUrl);

  const outgoing =
    token && isApiCall ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      const isCredentialCheck = request.url.includes('/auth/login') || request.url.includes('/auth/register');
      if (error instanceof HttpErrorResponse && error.status === 401 && token && !isCredentialCheck) {
        auth.handleSessionExpired();
      }
      return throwError(() => error);
    }),
  );
};
