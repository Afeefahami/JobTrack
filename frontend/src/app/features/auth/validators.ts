import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface PasswordChecks {
  length: boolean;
  lower: boolean;
  upper: boolean;
  digit: boolean;
}

export function passwordChecks(value: string): PasswordChecks {
  return {
    length: value.length >= 8,
    lower: /[a-z]/.test(value),
    upper: /[A-Z]/.test(value),
    digit: /\d/.test(value),
  };
}

/** Requires at least 8 characters with an upper case letter, a lower case letter and a number. */
export const strongPassword: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');
  if (!value) return null;
  const checks = passwordChecks(value);
  return Object.values(checks).every(Boolean) ? null : { weakPassword: checks };
};

/** Group validator: the two named controls must hold the same value. */
export function fieldsMatch(first: string, second: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(first)?.value;
    const b = group.get(second)?.value;
    return a && b && a !== b ? { mismatch: true } : null;
  };
}
