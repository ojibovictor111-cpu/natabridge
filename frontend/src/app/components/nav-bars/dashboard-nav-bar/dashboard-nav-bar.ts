import { Component, computed, EventEmitter, inject, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeLogout01 } from '@ng-icons/huge-icons';
import { AuthService } from '../../../services/auth/auth-service';
import { MatDialog } from '@angular/material/dialog';
import { Logout } from '../../modals/logout/logout';
import { lucideBellRing, lucideChartNoAxesCombined, lucideClipboardPlus, lucideLayoutDashboard, lucideSettings, lucideUsersRound } from '@ng-icons/lucide';

@Component({
  selector: 'nata-dashboard-nav-bar',
  imports: [NgIcon, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-nav-bar.html',
  styleUrl: './dashboard-nav-bar.css',
  providers: [provideIcons({ hugeLogout01, lucideLayoutDashboard, lucideClipboardPlus, lucideUsersRound, lucideBellRing, lucideChartNoAxesCombined, lucideSettings })],
})
export class DashboardNavBar {
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  readonly clinician = this.authService.user;
  readonly initials = computed(() => this.clinician()?.email.slice(0, 2).toUpperCase() ?? '');

  @Output() readonly navClicked = new EventEmitter<boolean>();

  logout() {
    const dialogRef = this.dialog.open(Logout);

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        void this.authService.logout();
      }
    });
  }

  toggleSidebar() {
    this.navClicked.emit(true);
  }
}
