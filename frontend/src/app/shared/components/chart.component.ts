import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { ThemeService } from '../../core/services/theme.service';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

export type ChartKind = 'doughnut' | 'bar' | 'hbar' | 'line';

function cssColor(value: string): string {
  if (!value.startsWith('--')) return value;
  return getComputedStyle(document.documentElement).getPropertyValue(value).trim() || '#888';
}

/**
 * Small wrapper around Chart.js. Pass plain labels and values; colours may be CSS variable names
 * (for example "--tone-blue") so charts follow the light and dark themes.
 */
@Component({
  selector: 'app-chart',
  template: `
    <div class="box" [style.height.px]="height()">
      <canvas #canvas role="img" [attr.aria-label]="label()"></canvas>
    </div>
  `,
  styles: `
    .box { position: relative; width: 100%; }
  `,
})
export class ChartComponent {
  readonly kind = input.required<ChartKind>();
  readonly labels = input.required<string[]>();
  readonly values = input.required<number[]>();
  readonly colors = input<string[]>(['--primary']);
  readonly seriesLabel = input('Applications');
  readonly height = input(260);
  readonly label = input('Chart');

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly theme = inject(ThemeService);
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      // Re-draw when the data or the theme changes.
      const config = this.buildConfig(this.theme.resolved());
      this.chart?.destroy();
      this.chart = new Chart(this.canvas().nativeElement, config);
    });
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }

  private buildConfig(_theme: string): ChartConfiguration {
    const kind = this.kind();
    const text = cssColor('--text-muted');
    const grid = cssColor('--border');
    const surface = cssColor('--surface');
    const palette = this.colors().map(cssColor);
    const fontFamily = getComputedStyle(document.body).fontFamily;
    const labels = [...this.labels()];
    const values = [...this.values()];

    const common = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      font: { family: fontFamily },
    };

    if (kind === 'doughnut') {
      const doughnut: ChartConfiguration<'doughnut'> = {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: labels.map((_, i) => palette[i % palette.length]),
              borderColor: surface,
              borderWidth: 3,
              hoverOffset: 4,
            },
          ],
        },
        options: {
          ...common,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: text, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 14, font: { family: fontFamily, size: 12 } },
            },
          },
        },
      };
      return doughnut as unknown as ChartConfiguration;
    }

    const horizontal = kind === 'hbar';
    const isLine = kind === 'line';
    const color = palette[0];
    const scaleOptions = {
      ticks: { color: text, precision: 0, font: { family: fontFamily, size: 12 } },
      grid: { color: grid },
      border: { display: false },
      beginAtZero: true,
    };
    const categoryOptions = {
      ticks: { color: text, font: { family: fontFamily, size: 12 } },
      grid: { display: false },
      border: { display: false },
    };

    return {
      type: isLine ? 'line' : 'bar',
      data: {
        labels,
        datasets: [
          {
            label: this.seriesLabel(),
            data: values,
            backgroundColor: isLine
              ? color + '22'
              : palette.length > 1
                ? labels.map((_, i) => palette[i % palette.length])
                : color,
            borderColor: color,
            borderWidth: isLine ? 2.5 : 0,
            borderRadius: isLine ? 0 : 6,
            borderSkipped: false,
            maxBarThickness: horizontal ? 26 : 38,
            tension: 0.35,
            fill: isLine,
            pointRadius: isLine ? 3.5 : 0,
            pointBackgroundColor: color,
          },
        ],
      },
      options: {
        ...common,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: { legend: { display: false } },
        scales: {
          x: horizontal ? scaleOptions : categoryOptions,
          y: horizontal ? categoryOptions : scaleOptions,
        },
      },
    } as ChartConfiguration;
  }
}
