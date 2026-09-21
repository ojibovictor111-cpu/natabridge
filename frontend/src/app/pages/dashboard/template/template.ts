import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import {
  HlmSidebarImports,
  HlmSidebarService,
  provideHlmSidebarConfig,
} from '@spartan-ng/helm/sidebar';
import { DashboardNavBar } from '../../../components/nav-bars/dashboard-nav-bar/dashboard-nav-bar';
import { PageLoader } from '../../../components/loaders/page-loader/page-loader';
import { AuthService } from '../../../services/auth/auth-service';

@Component({
  selector: 'nata-template',
  imports: [
    DashboardNavBar,
    PageLoader,
    RouterLink,
    RouterOutlet,
    ...HlmAvatarImports,
    ...HlmSidebarImports,
  ],
  templateUrl: './template.html',
  styleUrl: './template.css',
  providers: [
    HlmSidebarService,
    provideHlmSidebarConfig({
      sidebarWidth: '15rem',
      sidebarWidthMobile: '18rem',
      sidebarWidthIcon: '3.5rem',
      closeMobileSidebarOnMenuButtonClick: true,
    }),
  ],
})
export class Template {
  private readonly authService = inject(AuthService);
  readonly router = inject(Router);
  readonly initials = computed(() => this.authService.user()?.email.slice(0, 2).toUpperCase() ?? 'C');

  pageTitle(): string {
    const url = this.router.url;

    if (/\/patients\/[^/?]+\/assessment/.test(url)) return 'Patient assessment';
    if (/\/patients\/[^/?]+/.test(url)) return 'Patient details';
    if (url.includes('/patients')) return 'Patients';
    if (/\/assessments\/[^/?]+/.test(url)) return 'Assessment details';
    if (url.includes('/assessments')) return 'Assessments';
    if (url.includes('/assessment')) return 'New assessment';
    if (url.includes('/profile')) return 'Settings';

    return 'Overview';
  }
}
