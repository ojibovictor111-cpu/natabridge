import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChartNoAxesCombined,
  lucideClipboardPlus,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideSettings,
  lucideUsersRound,
} from '@ng-icons/lucide';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { ACCESS } from '../../../core/auth/access';
import { AuthService } from '../../../services/auth/auth-service';
import { Logout } from '../../modals/logout/logout';

@Component({
  selector: 'nata-dashboard-nav-bar',
  imports: [NgIcon, RouterLink, RouterLinkActive, ...HlmAvatarImports, ...HlmSidebarImports],
  templateUrl: './dashboard-nav-bar.html',
  styleUrl: './dashboard-nav-bar.css',
  providers: [
    provideIcons({
      lucideChartNoAxesCombined,
      lucideClipboardPlus,
      lucideLayoutDashboard,
      lucideLogOut,
      lucideSettings,
      lucideUsersRound,
    }),
  ],
})
export class DashboardNavBar {
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly clinician = this.authService.user;
  readonly activeInstitutionId = this.authService.activeInstitutionId;
  readonly institutionIds = computed(() => [
    ...new Set(
      (this.clinician()?.roles ?? [])
        .map((role) => role.institutionId)
        .filter((institutionId): institutionId is string => Boolean(institutionId)),
    ),
  ]);
  readonly initials = computed(() => this.clinician()?.email.slice(0, 2).toUpperCase() ?? 'C');
  readonly canViewOverview = computed(() =>
    this.authService.hasAnyPermission([
      ...ACCESS.clinical.assessments.list,
      ...ACCESS.clinical.patients.list,
    ]),
  );
  readonly canViewAssessments = computed(() =>
    this.authService.hasAllPermissions(ACCESS.clinical.assessments.list),
  );
  readonly canViewPatients = computed(() =>
    this.authService.hasAllPermissions(ACCESS.clinical.patients.list),
  );
  readonly canViewAnalytics = computed(() =>
    this.authService.hasAnyPermission([
      ...ACCESS.platform.dashboard,
      ...ACCESS.institution.dashboard,
    ]),
  );
  readonly roleLabel = computed(() => this.authService.roleLabels().join(', ') || 'User');

  selectInstitution(event: Event): void {
    const institutionId = (event.target as HTMLSelectElement).value || null;
    this.authService.setActiveInstitution(institutionId);
    void this.router.navigateByUrl('/dashboard');
  }

  logout(): void {
    const dialogRef = this.dialog.open(Logout);

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.authService.logout();
    });
  }
}
