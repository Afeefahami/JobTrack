import { Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  template: `
    <span class="logo" [class.light]="light()">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="var(--primary)" />
        <rect x="7" y="17" width="4.5" height="8" rx="1.5" fill="#fff" opacity=".55" />
        <rect x="13.75" y="12" width="4.5" height="13" rx="1.5" fill="#fff" opacity=".8" />
        <rect x="20.5" y="7" width="4.5" height="18" rx="1.5" fill="#fff" />
      </svg>
      @if (!iconOnly()) {
        <span class="word">JobTrack</span>
      }
    </span>
  `,
  styles: `
    .logo { display: inline-flex; align-items: center; gap: 0.6rem; }
    .word { font-family: var(--font-display); font-weight: 700; font-size: 1.25rem; letter-spacing: -0.02em; color: var(--text); }
    .light .word { color: #fff; }
  `,
})
export class LogoComponent {
  readonly light = input(false);
  readonly iconOnly = input(false);
}
