/** Dates from the API are plain "YYYY-MM-DD" strings. Parse them as local dates to avoid time-zone shifts. */
export function parseDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function addDaysIso(days: number, from: Date = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return toIsoDate(date);
}

export function daysFromToday(value: string): number {
  const today = parseDate(todayIso());
  return Math.round((parseDate(value).getTime() - today.getTime()) / 86_400_000);
}

export function formatDate(value: string | null | undefined, style: 'long' | 'short' = 'long'): string {
  if (!value) return '';
  return parseDate(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
  });
}

/** "10:00:00" -> "10:00 AM" */
export function formatTime(value: string | null | undefined): string {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/** "10:00:00" -> "10:00" for <input type="time"> */
export function toTimeInput(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : '';
}

/** "Today", "Tomorrow", "In 3 days", "2 days ago" ... */
export function relativeDay(value: string): string {
  const diff = daysFromToday(value);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 15) return `In ${diff} days`;
  if (diff < -1 && diff > -15) return `${-diff} days ago`;
  return formatDate(value, 'short');
}

export function relativeDayAndTime(date: string, time: string | null): string {
  const day = relativeDay(date);
  return time ? `${day} — ${formatTime(time)}` : day;
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
