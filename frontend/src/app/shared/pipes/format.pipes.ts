import { Pipe, PipeTransform } from '@angular/core';

import { formatDate, formatTime, relativeDay } from '../utils/date';

/** {{ '2026-09-15' | fdate }} -> 15 September 2026 ({{ x | fdate:'short' }} -> 15 Sep 2026) */
@Pipe({ name: 'fdate' })
export class FormatDatePipe implements PipeTransform {
  transform(value: string | null | undefined, style: 'long' | 'short' = 'long'): string {
    return formatDate(value, style);
  }
}

/** {{ '10:00:00' | ftime }} -> 10:00 AM */
@Pipe({ name: 'ftime' })
export class FormatTimePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatTime(value);
  }
}

/** {{ '2026-09-16' | relday }} -> Tomorrow */
@Pipe({ name: 'relday' })
export class RelativeDayPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? relativeDay(value) : '';
  }
}
