import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../shared/components/icon.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

interface Board {
  name: string;
  note: string;
  url: (keywords: string, location: string) => string;
}

@Component({
  selector: 'app-job-search',
  imports: [FormsModule, RouterLink, IconComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Job Search" subtitle="Find openings on the sites you already use, then bring them back here to track." />

    <section class="card intro">
      <span class="badge-icon"><app-icon name="shield" [size]="22" /></span>
      <div>
        <h2>JobTrack tracks jobs. It does not scrape job sites.</h2>
        <p class="muted">
          The buttons below simply open a search on each site in a new tab, exactly as if you had typed it there.
          When you apply, copy the job description and add it to JobTrack.
        </p>
      </div>
    </section>

    <div class="cols">
      <section class="card">
        <div class="card-header"><h2>Open a search</h2></div>
        <div class="stack">
          <div class="field">
            <label for="kw">Job title or keywords</label>
            <input id="kw" type="text" [ngModel]="keywords()" (ngModelChange)="keywords.set($event)" placeholder="Python developer" />
          </div>
          <div class="field">
            <label for="loc">Location (optional)</label>
            <input id="loc" type="text" [ngModel]="location()" (ngModelChange)="location.set($event)" placeholder="Kochi, or Remote" />
          </div>
          <div class="boards">
            @for (board of boards; track board.name) {
              <a class="board" [class.disabled]="!keywords().trim()" [attr.href]="keywords().trim() ? board.url(keywords().trim(), location().trim()) : null" target="_blank" rel="noopener noreferrer">
                <span><strong>{{ board.name }}</strong><small class="muted">{{ board.note }}</small></span>
                <app-icon name="external-link" [size]="17" />
              </a>
            }
          </div>
          @if (!keywords().trim()) { <p class="text-sm faint">Enter a job title or keywords to enable the search links.</p> }
        </div>
      </section>

      <section class="card">
        <div class="card-header"><h2>Found something? Track it</h2></div>
        <ol class="steps">
          <li><strong>Apply</strong><span class="muted">Apply on the job site or the company page.</span></li>
          <li><strong>Copy</strong><span class="muted">Copy the full job description.</span></li>
          <li><strong>Paste</strong><span class="muted">Paste it into JobTrack and choose Extract Details.</span></li>
          <li><strong>Track</strong><span class="muted">Review, save, and follow the application to an offer.</span></li>
        </ol>
        <a routerLink="/applications/new" class="btn btn-primary"><app-icon name="clipboard" [size]="17" /> Add from a job description</a>
      </section>
    </div>

    <section class="card future">
      <div class="card-header"><h2>Planned integrations</h2><span class="chip">Not available yet</span></div>
      <p class="muted text-sm">Ideas for later versions. They would only use official APIs or sources that permit it.</p>
      <ul>
        <li><app-icon name="globe" [size]="17" /><span><strong>Job board APIs</strong> Official partner APIs, where a provider's terms allow it.</span></li>
        <li><app-icon name="mail" [size]="17" /><span><strong>Email import</strong> Turn application confirmation emails into tracked applications.</span></li>
        <li><app-icon name="bell" [size]="17" /><span><strong>Saved searches</strong> Get a reminder to re-run your favourite searches.</span></li>
      </ul>
    </section>
  `,
  styles: `
    .intro { display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; border-color: color-mix(in srgb, var(--primary) 30%, var(--border)); background: color-mix(in srgb, var(--primary-soft) 50%, var(--surface)); }
    .badge-icon { flex: none; width: 46px; height: 46px; display: grid; place-items: center; border-radius: 14px; background: var(--primary); color: var(--primary-contrast); }
    .intro h2 { margin-bottom: 0.25rem; }
    .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .boards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
    .board { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.75rem 0.9rem; border: 1px solid var(--border-strong); border-radius: 12px; color: var(--text); transition: border-color 0.16s, background-color 0.16s; }
    .board span { display: flex; flex-direction: column; }
    .board small { font-size: 12px; }
    .board:hover { border-color: var(--primary); background: var(--primary-soft); text-decoration: none; }
    .board.disabled { opacity: 0.5; pointer-events: none; }
    .steps { display: flex; flex-direction: column; gap: 0.9rem; margin-bottom: 1.25rem; counter-reset: step; }
    .steps li { display: flex; flex-direction: column; padding-left: 2.6rem; position: relative; counter-increment: step; }
    .steps li::before { content: counter(step); position: absolute; left: 0; top: 0; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; background: var(--primary-soft); color: var(--primary); font-weight: 700; font-size: 13px; }
    .future ul { display: flex; flex-direction: column; gap: 0.8rem; margin-top: 1rem; }
    .future li { display: flex; gap: 0.7rem; align-items: flex-start; color: var(--text-muted); }
    .future li strong { color: var(--text); margin-right: 0.35rem; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
    @media (max-width: 480px) { .boards { grid-template-columns: 1fr; } }
  `,
})
export class JobSearchComponent {
  protected readonly keywords = signal('');
  protected readonly location = signal('');
  protected readonly hasKeywords = computed(() => !!this.keywords().trim());

  protected readonly boards: Board[] = [
    {
      name: 'LinkedIn',
      note: 'Jobs search',
      url: (k, l) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(k)}&location=${encodeURIComponent(l)}`,
    },
    {
      name: 'Indeed',
      note: 'Job search',
      url: (k, l) => `https://www.indeed.com/jobs?q=${encodeURIComponent(k)}&l=${encodeURIComponent(l)}`,
    },
    {
      name: 'Glassdoor',
      note: 'Jobs and reviews',
      url: (k, l) => `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(k)}&locKeyword=${encodeURIComponent(l)}`,
    },
    {
      name: 'Google Jobs',
      note: 'Aggregated listings',
      url: (k, l) => `https://www.google.com/search?q=${encodeURIComponent(`${k} jobs ${l}`.trim())}&ibp=htl;jobs`,
    },
  ];
}
