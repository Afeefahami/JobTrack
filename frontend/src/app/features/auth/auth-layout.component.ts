import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../shared/components/icon.component';
import { LogoComponent } from '../../shared/components/logo.component';

/** Two-column layout used by the sign-in, registration and password pages. */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, LogoComponent, IconComponent],
  template: `
    <div class="auth">
      <section class="visual" aria-hidden="true">
        <a routerLink="/" class="logo-link"><app-logo [light]="true" /></a>

        <div class="rings"><span></span><span></span><span></span></div>

        <div class="float f1">
          <div class="mini-head"><strong>Python Developer</strong><span class="mini-badge blue">Interview</span></div>
          <div class="mini-sub"><app-icon name="building" [size]="14" /> ABC Technologies</div>
          <div class="mini-sub"><app-icon name="map-pin" [size]="14" /> Kochi · Hybrid</div>
        </div>
        <div class="float f2">
          <div class="mini-head"><strong>Offer received</strong><app-icon name="award" [size]="16" /></div>
          <div class="mini-sub">Nimbus Labs · Full Stack Developer</div>
        </div>
        <div class="float f3">
          <div class="mini-head"><strong>Follow up with ABC</strong></div>
          <div class="mini-sub"><app-icon name="bell" [size]="14" /> Tomorrow — 10:00 AM</div>
        </div>
        <div class="float f4">
          <div class="bars"><i style="height: 30%"></i><i style="height: 55%"></i><i style="height: 42%"></i><i style="height: 78%"></i><i style="height: 100%"></i></div>
          <div class="mini-sub">Applications this month</div>
        </div>

        <p class="tagline">Every application, every interview, every follow-up. In one calm place.</p>
      </section>

      <section class="panel">
        <a routerLink="/" class="mobile-logo"><app-logo /></a>
        <div class="card-wrap"><ng-content /></div>
      </section>
    </div>
  `,
  styleUrl: './auth-layout.component.css',
})
export class AuthLayoutComponent {}
