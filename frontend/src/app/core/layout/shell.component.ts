import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { IconComponent } from '../../shared/components/icon.component';
import { LogoComponent } from '../../shared/components/logo.component';
import { FormatTimePipe, RelativeDayPipe } from '../../shared/pipes/format.pipes';
import { addDaysIso } from '../../shared/utils/date';
import { Reminder } from '../models/models';
import { AuthService } from '../services/auth.service';
import { ReminderService } from '../services/reminder.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, IconComponent, LogoComponent, RelativeDayPipe, FormatTimePipe],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly reminderApi = inject(ReminderService);

  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Applications', path: '/applications', icon: 'briefcase' },
    { label: 'Add Application', path: '/applications/new', icon: 'plus' },
    { label: 'Timeline', path: '/timeline', icon: 'timeline' },
    { label: 'Reminders', path: '/reminders', icon: 'bell' },
    { label: 'Job Search', path: '/job-search', icon: 'search' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
  ];

  protected readonly today = addDaysIso(0);
  protected readonly menuOpen = signal(false);
  protected readonly notificationsOpen = signal(false);
  protected readonly profileOpen = signal(false);
  private readonly openReminders = signal<Reminder[]>([]);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly currentLabel = computed(() => {
    const url = this.url().split('?')[0];
    return this.navItems.find((item) => this.isActive(item, url))?.label ?? 'JobTrack';
  });

  /** Open reminders that are overdue or due by tomorrow. */
  protected readonly dueReminders = computed(() => {
    const limit = addDaysIso(1);
    return this.openReminders().filter((reminder) => reminder.reminder_date <= limit);
  });

  protected readonly badgeCount = computed(() => {
    const today = addDaysIso(0);
    return this.openReminders().filter((reminder) => reminder.reminder_date <= today).length;
  });

  protected readonly initials = computed(() => {
    const name = this.auth.user()?.full_name ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  });

  constructor() {
    // Refresh the notification badge after every navigation (reminders may have changed).
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.menuOpen.set(false);
      this.notificationsOpen.set(false);
      this.profileOpen.set(false);
      this.loadReminders();
    });
    this.loadReminders();
  }

  protected isActive(item: NavItem, url: string = this.url().split('?')[0]): boolean {
    if (item.path === '/applications') {
      return url.startsWith('/applications') && !url.startsWith('/applications/new');
    }
    return url === item.path || url.startsWith(item.path + '/');
  }

  protected toggleNotifications(): void {
    this.notificationsOpen.update((open) => !open);
    this.profileOpen.set(false);
  }

  protected toggleProfile(): void {
    this.profileOpen.update((open) => !open);
    this.notificationsOpen.set(false);
  }

  protected logout(): void {
    this.auth.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('[data-menu]')) {
      this.notificationsOpen.set(false);
      this.profileOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.notificationsOpen.set(false);
    this.profileOpen.set(false);
    this.menuOpen.set(false);
  }

  private loadReminders(): void {
    this.reminderApi.list({ completed: false }).subscribe({
      next: (reminders) => this.openReminders.set(reminders),
      error: () => this.openReminders.set([]),
    });
  }
}
