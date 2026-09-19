import { Component, HostListener, inject, signal } from '@angular/core';
import { DashboardNavBar } from '../../../components/nav-bars/dashboard-nav-bar/dashboard-nav-bar';
import { Router, RouterModule } from '@angular/router';
import { PageLoader } from '../../../components/loaders/page-loader/page-loader';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeMenu02, hugeMinusSign } from '@ng-icons/huge-icons';

@Component({
  selector: 'nata-template',
  imports: [DashboardNavBar, PageLoader, RouterModule, NgIcon],
  templateUrl: './template.html',
  styleUrl: './template.css',
  viewProviders: [
    provideIcons({
      hugeMenu02,
      hugeMinusSign,
    }),
  ],
})
export class Template {
  readonly router = inject(Router);
  readonly isNavBarOpened = signal(false);

  openNavBar() {
    this.isNavBarOpened.set(true);
  }

  closeNavBar() {
    this.isNavBarOpened.set(false);
  }

  closeSideBar(navClicked: boolean) {
    if (navClicked) {
      this.closeNavBar();
    }
  }

  pageTitle() {
    const url = this.router.url;

    if (/\/patients\/[^/?]+/.test(url)) return 'Patient details';
    if (url.includes('/patients')) return 'Patients';
    if (url.includes('/assessment')) return 'New assessment';
    if (url.includes('/profile')) return 'Settings';

    return 'Overview';
  }

  @HostListener('document:keydown.escape')
  closeSidebarOnEscape() {
    this.closeNavBar();
  }
}
