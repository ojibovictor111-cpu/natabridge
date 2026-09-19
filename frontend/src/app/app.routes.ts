import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((page) => page.Home),
  },
  {
    path: 'auth',
    loadComponent: () => import('./pages/auth/auth').then((page) => page.Auth),
  },
  {
    path: 'assessment',
    loadComponent: () => import('./pages/quick-test/quick-test').then((page) => page.QuickTest),
  },
  {
    path: 'assessment/result',
    loadComponent: () =>
      import('./pages/quick-test-result/quick-test-result').then((page) => page.QuickTestResult),
  },
  {
    path: 'dashboard',
    canActivate: [
      () => {
        const injector = inject(EnvironmentInjector);
        return import('./core/firebase/auth.guard').then(({ requireFirebaseUser }) =>
          runInInjectionContext(injector, requireFirebaseUser),
        );
      },
    ],
    loadComponent: () =>
      import('./pages/dashboard/template/template').then((page) => page.Template),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard/home/home').then((page) => page.Home),
      },
      {
        path: 'patients',
        children: [
          {
            path: 'register',
            loadComponent: () =>
              import('./pages/dashboard/patients/register-patient/register-patient').then(
                (page) => page.RegisterPatient,
              ),
          },
          {
            path: ':patientId/assessment',
            loadComponent: () =>
              import('./pages/dashboard/assessment/test/user-assessment').then(
                (page) => page.UserAssessment,
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./pages/dashboard/patients/patient-details/patient-details').then(
                (page) => page.PatientDetails,
              ),
          },
          {
            path: '',
            loadComponent: () =>
              import('./pages/dashboard/patients/patients').then((page) => page.Patients),
          },
        ],
      },
      {
        path: 'assessment',
        loadComponent: () =>
          import('./pages/dashboard/assessment/test/user-assessment').then(
            (page) => page.UserAssessment,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/dashboard/profile/profile').then((page) => page.Profile),
        data: {
          profileType: 'user',
        },
      },
    ],
  },
];
