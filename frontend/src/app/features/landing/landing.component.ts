import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon.component';
import { LogoComponent } from '../../shared/components/logo.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

const DEMO_TEXT = [
  'Python Developer',
  'ABC Technologies · Kochi, Kerala, India (Hybrid)',
  'Full-time',
  '',
  'Experience: 2-4 years',
  'Skills: FastAPI, SQL, Docker',
  'Salary: ₹6,00,000 - ₹9,00,000 per annum',
].join('\n');

interface DemoField {
  label: string;
  value?: string;
  chips?: string[];
}

const DEMO_FIELDS: DemoField[] = [
  { label: 'Job title', value: 'Python Developer' },
  { label: 'Company', value: 'ABC Technologies' },
  { label: 'Location', value: 'Kochi, Kerala, India' },
  { label: 'Work type', value: 'Hybrid' },
  { label: 'Skills', chips: ['Python', 'FastAPI', 'SQL', 'Docker'] },
  { label: 'Experience', value: '2-4 years' },
  { label: 'Salary', value: '₹6,00,000 - ₹9,00,000 per annum' },
];

@Component({
  selector: 'app-landing',
  imports: [RouterLink, IconComponent, LogoComponent, RevealDirective],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly fields = DEMO_FIELDS;
  protected readonly typed = signal(0);
  protected readonly revealed = signal(0);
  protected readonly menuOpen = signal(false);
  protected readonly year = new Date().getFullYear();

  protected readonly typedText = computed(() => DEMO_TEXT.slice(0, this.typed()));
  protected readonly extracting = computed(() => this.typed() >= DEMO_TEXT.length && this.revealed() < DEMO_FIELDS.length);

  protected readonly steps = [
    { title: 'Apply anywhere', text: 'Find the job on LinkedIn, Indeed or a company site and apply as usual.' },
    { title: 'Copy the description', text: 'Select the whole posting and copy it.' },
    { title: 'Paste into JobTrack', text: 'Open Add Application and paste it into the description box.' },
    { title: 'Extract details', text: 'JobTrack reads the text and fills in the form. Anything it cannot find stays blank.' },
    { title: 'Review and save', text: 'Fix anything you like, save it, and the job card appears on your dashboard.' },
  ];

  ngOnInit(): void {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      this.typed.set(DEMO_TEXT.length);
      this.revealed.set(DEMO_FIELDS.length);
      return;
    }
    this.play();
  }

  /** Types the sample posting, fills the fields one by one, pauses, then starts over. */
  private play(): void {
    let timer: ReturnType<typeof setTimeout>;
    const stop = () => clearTimeout(timer);
    this.destroyRef.onDestroy(stop);

    const typeStep = () => {
      if (this.typed() < DEMO_TEXT.length) {
        this.typed.update((n) => Math.min(DEMO_TEXT.length, n + 2));
        timer = setTimeout(typeStep, 22);
      } else {
        timer = setTimeout(revealStep, 500);
      }
    };
    const revealStep = () => {
      if (this.revealed() < DEMO_FIELDS.length) {
        this.revealed.update((n) => n + 1);
        timer = setTimeout(revealStep, 380);
      } else {
        timer = setTimeout(() => {
          this.typed.set(0);
          this.revealed.set(0);
          timer = setTimeout(typeStep, 600);
        }, 4200);
      }
    };
    timer = setTimeout(typeStep, 700);
  }
}
