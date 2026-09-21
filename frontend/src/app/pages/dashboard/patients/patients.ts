import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideActivity,
  lucideArrowLeft,
  lucideChevronRight,
  lucideRefreshCw,
  lucideSearch,
  lucideUserPlus,
  lucideUsersRound,
} from '@ng-icons/lucide';
import { PatientApi } from '../../../models/patient/Patient.api';
import { ACCESS } from '../../../core/auth/access';
import { AuthService } from '../../../services/auth/auth-service';
import { PatientService } from '../../../services/patient/patient-service';

type RiskTone = 'high' | 'mid' | 'low' | 'none';
type RiskFilter = 'all' | RiskTone;
type PatientSort = 'name' | 'age' | 'gestationalAge' | 'lastAssessment' | 'currentRiskLevel';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'nata-patients',
  imports: [
    DatePipe,
    NgIcon,
    RouterLink,
    ...HlmButtonImports,
    ...HlmInputImports,
    ...HlmSkeletonImports,
  ],
  templateUrl: './patients.html',
  styleUrl: './patients.css',
  viewProviders: [
    provideIcons({
      lucideActivity,
      lucideArrowLeft,
      lucideChevronRight,
      lucideRefreshCw,
      lucideSearch,
      lucideUserPlus,
      lucideUsersRound,
    }),
  ],
})
export class Patients implements OnInit {
  private readonly patientService = inject(PatientService);
  private readonly authService = inject(AuthService);

  readonly loading = this.patientService.loading;
  readonly errorMessage = this.patientService.errorMessage;
  readonly patients = this.patientService.patients;
  readonly searchTerm = signal('');
  readonly riskFilter = signal<RiskFilter>('all');
  readonly sortColumn = signal<PatientSort>('name');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly canRegisterPatient = computed(() =>
    this.authService.hasAllPermissions(ACCESS.clinical.patients.create),
  );

  readonly filteredPatients = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const risk = this.riskFilter();

    const filteredPatients = this.patients().filter((patient) => {
      const matchesSearch =
        !search ||
        patient.name.toLowerCase().includes(search) ||
        patient.id.toLowerCase().includes(search);
      const matchesRisk = risk === 'all' || this.riskTone(patient.currentRiskLevel) === risk;

      return matchesSearch && matchesRisk;
    });

    return [...filteredPatients].sort((firstPatient, secondPatient) =>
      this.comparePatients(firstPatient, secondPatient),
    );
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredPatients().length / this.pageSize())),
  );

  readonly activePage = computed(() => Math.min(this.currentPage(), this.totalPages()));

  readonly visiblePatients = computed(() => {
    const start = (this.activePage() - 1) * this.pageSize();

    return this.filteredPatients().slice(start, start + this.pageSize());
  });

  readonly pageStart = computed(() => {
    if (!this.filteredPatients().length) return 0;

    return (this.activePage() - 1) * this.pageSize() + 1;
  });

  readonly pageEnd = computed(() =>
    Math.min(this.activePage() * this.pageSize(), this.filteredPatients().length),
  );

  readonly assessedPatients = computed(
    () => this.patients().filter((patient) => Boolean(patient.lastAssessment)).length,
  );

  readonly highRiskPatients = computed(
    () =>
      this.patients().filter((patient) => this.riskTone(patient.currentRiskLevel) === 'high')
        .length,
  );

  readonly hasActiveFilters = computed(
    () => Boolean(this.searchTerm().trim()) || this.riskFilter() !== 'all',
  );

  readonly initialLoadUnavailable = computed(
    () => Boolean(this.errorMessage()) && !this.patients().length,
  );

  ngOnInit() {
    this.patientService.getPatients();
  }

  updateSearch(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  updateRiskFilter(event: Event) {
    this.riskFilter.set((event.target as HTMLSelectElement).value as RiskFilter);
    this.currentPage.set(1);
  }

  updatePageSize(event: Event) {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.currentPage.set(1);
  }

  updateMobileSort(event: Event) {
    const [column, direction] = (event.target as HTMLSelectElement).value.split(':') as [
      PatientSort,
      SortDirection,
    ];

    this.sortColumn.set(column);
    this.sortDirection.set(direction);
    this.currentPage.set(1);
  }

  toggleSort(column: PatientSort) {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }

    this.currentPage.set(1);
  }

  sortAria(column: PatientSort): 'ascending' | 'descending' | null {
    if (this.sortColumn() !== column) return null;

    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  sortIndicator(column: PatientSort) {
    if (this.sortColumn() !== column) return '↕';

    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  clearFilters() {
    this.searchTerm.set('');
    this.riskFilter.set('all');
    this.currentPage.set(1);
  }

  previousPage() {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  nextPage() {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }

  refreshPatients() {
    this.patientService.getPatients();
  }

  patientInitials(name: string) {
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

    return initials || 'PT';
  }

  riskTone(risk: string | null): RiskTone {
    const normalizedRisk = risk?.toLowerCase() ?? '';

    if (normalizedRisk.includes('high')) return 'high';
    if (normalizedRisk.includes('mid') || normalizedRisk.includes('medium')) return 'mid';
    if (normalizedRisk.includes('low')) return 'low';

    return 'none';
  }

  riskLabel(risk: string | null) {
    switch (this.riskTone(risk)) {
      case 'high':
        return 'High risk';
      case 'mid':
        return 'Mid risk';
      case 'low':
        return 'Low risk';
      default:
        return 'Not assessed';
    }
  }

  dateTimeValue(value: string | Date | null) {
    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  trackPatient(_: number, patient: PatientApi) {
    return patient.id;
  }

  private comparePatients(firstPatient: PatientApi, secondPatient: PatientApi) {
    const column = this.sortColumn();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    const firstValue = this.sortValue(firstPatient, column);
    const secondValue = this.sortValue(secondPatient, column);

    if (firstValue === null && secondValue === null) return 0;
    if (firstValue === null) return 1;
    if (secondValue === null) return -1;

    const comparison =
      typeof firstValue === 'number' && typeof secondValue === 'number'
        ? firstValue - secondValue
        : String(firstValue).localeCompare(String(secondValue), undefined, {
            numeric: true,
            sensitivity: 'base',
          });

    return comparison * direction;
  }

  private sortValue(patient: PatientApi, column: PatientSort): string | number | null {
    if (column === 'lastAssessment') {
      if (!patient.lastAssessment) return null;

      const timestamp = new Date(patient.lastAssessment).getTime();

      return Number.isNaN(timestamp) ? null : timestamp;
    }

    return patient[column];
  }
}
