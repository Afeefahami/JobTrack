import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from './core/services/theme.service';
import { ConfirmHostComponent } from './shared/components/confirm-host.component';
import { ToastContainerComponent } from './shared/components/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, ConfirmHostComponent],
  template: `
    <router-outlet />
    <app-toast-container />
    <app-confirm-host />
  `,
})
export class App {
  // Injected so the saved theme is applied as soon as the app starts.
  private readonly theme = inject(ThemeService);
}
