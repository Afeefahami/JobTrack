import { Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { IconComponent } from './icon.component';

/** Tag-style input for a list of skills. Works with formControlName (value is string[]). */
@Component({
  selector: 'app-skills-input',
  imports: [IconComponent],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SkillsInputComponent), multi: true }],
  template: `
    <div class="box" [class.focus]="focused()" [class.disabled]="disabled()" (click)="input.focus()">
      @for (skill of skills(); track skill) {
        <span class="tag">
          {{ skill }}
          <button type="button" [attr.aria-label]="'Remove ' + skill" (click)="remove(skill); $event.stopPropagation()">
            <app-icon name="x" [size]="13" />
          </button>
        </span>
      }
      <input
        #input
        type="text"
        [placeholder]="skills().length ? '' : 'Type a skill and press Enter'"
        [disabled]="disabled()"
        (keydown)="onKey($event, input)"
        (paste)="onPaste($event)"
        (focus)="focused.set(true)"
        (blur)="focused.set(false); commit(input); touched()"
        aria-label="Add a skill"
      />
    </div>
  `,
  styles: `
    .box { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; padding: 0.4rem 0.5rem; min-height: 44px; border: 1px solid var(--border-strong); border-radius: var(--radius-md); background: var(--surface); cursor: text; transition: border-color 0.16s, box-shadow 0.16s; }
    .box:hover { border-color: var(--text-faint); }
    .box.focus { border-color: var(--primary); box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 18%, transparent); }
    .box.disabled { opacity: 0.6; }
    .tag { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.3rem 0.2rem 0.6rem; border-radius: 7px; background: var(--primary-soft); color: var(--primary); font-size: 13px; font-weight: 600; }
    .tag button { display: grid; place-items: center; width: 18px; height: 18px; border: 0; border-radius: 5px; background: transparent; color: inherit; padding: 0; }
    .tag button:hover { background: color-mix(in srgb, var(--primary) 20%, transparent); }
    input { flex: 1; min-width: 140px; border: 0; padding: 0.25rem 0.3rem; background: transparent; box-shadow: none !important; }
    input:focus { border: 0; }
  `,
})
export class SkillsInputComponent implements ControlValueAccessor {
  protected readonly skills = signal<string[]>([]);
  protected readonly disabled = signal(false);
  protected readonly focused = signal(false);

  private onChange: (value: string[]) => void = () => undefined;
  protected touched: () => void = () => undefined;

  writeValue(value: string[] | null): void {
    this.skills.set(Array.isArray(value) ? [...value] : []);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onKey(event: KeyboardEvent, input: HTMLInputElement): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commit(input);
    } else if (event.key === 'Backspace' && !input.value && this.skills().length) {
      this.update(this.skills().slice(0, -1));
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    if (text.includes(',')) {
      event.preventDefault();
      this.add(text.split(','));
    }
  }

  protected commit(input: HTMLInputElement): void {
    if (input.value.trim()) {
      this.add(input.value.split(','));
      input.value = '';
    }
  }

  protected remove(skill: string): void {
    this.update(this.skills().filter((item) => item !== skill));
  }

  private add(items: string[]): void {
    const current = this.skills();
    const known = new Set(current.map((item) => item.toLowerCase()));
    const next = [...current];
    for (const raw of items) {
      const skill = raw.trim();
      if (skill && !known.has(skill.toLowerCase())) {
        known.add(skill.toLowerCase());
        next.push(skill);
      }
    }
    this.update(next);
  }

  private update(next: string[]): void {
    this.skills.set(next);
    this.onChange(next);
  }
}
