import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenResponse, User } from '../models/models';

const TOKEN_KEY = 'jobtrack_token';

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = `${environment.apiUrl}/auth`;

  readonly token = signal<string | null>(readToken());
  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.token());
  readonly firstName = computed(() => this.user()?.full_name.split(' ')[0] ?? '');

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<TokenResponse>(`${this.api}/login`, { email, password })
      .pipe(map((response) => this.startSession(response)));
  }

  register(fullName: string, email: string, password: string): Observable<User> {
    return this.http
      .post<TokenResponse>(`${this.api}/register`, { full_name: fullName, email, password })
      .pipe(map((response) => this.startSession(response)));
  }

  /** Loads the current user when a token exists (page refresh). Emits false if the token is not valid. */
  loadUser(): Observable<boolean> {
    if (!this.token()) return of(false);
    if (this.user()) return of(true);
    return this.http.get<User>(`${this.api}/me`).pipe(
      tap((user) => this.user.set(user)),
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  updateProfile(fullName: string, email: string): Observable<User> {
    return this.http
      .put<User>(`${this.api}/me`, { full_name: fullName, email })
      .pipe(tap((user) => this.user.set(user)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/change-password`, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/reset-password`, {
      token,
      new_password: newPassword,
    });
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  /** Called by the HTTP interceptor when the API answers 401 for a signed-in user. */
  handleSessionExpired(): void {
    if (!this.token()) return;
    this.clearSession();
    void this.router.navigate(['/login'], { queryParams: { expired: 1 } });
  }

  private startSession(response: TokenResponse): User {
    try {
      localStorage.setItem(TOKEN_KEY, response.access_token);
    } catch {
      /* storage unavailable: the session lasts until the tab closes */
    }
    this.token.set(response.access_token);
    this.user.set(response.user);
    return response.user;
  }

  private clearSession(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    this.token.set(null);
    this.user.set(null);
  }
}
