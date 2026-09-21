import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { Routes } from '@angular/router';
import { ACCESS } from './core/auth/access';
import {
  requireAllPermissions,
  requireAnyPermission,
} from './core/auth/permission.guard';

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
        path: 'forbidden',
        loadComponent: () =>
          import('./pages/dashboard/forbidden/forbidden').then((page) => page.Forbidden),
      },
      {
        path: 'patients',
        children: [
          {
            path: 'register',
            canActivate: [requireAllPermissions(ACCESS.clinical.patients.create)],
            loadComponent: () =>
              import('./pages/dashboard/patients/register-patient/register-patient').then(
                (page) => page.RegisterPatient,
              ),
          },
          {
            path: ':patientId/assessment',
            canActivate: [
              requireAllPermissions(ACCESS.clinical.assessments.createForExistingPatient),
            ],
            loadComponent: () =>
              import('./pages/dashboard/assessment/test/user-assessment').then(
                (page) => page.UserAssessment,
              ),
          },
          {
            path: ':id',
            canActivate: [requireAllPermissions(ACCESS.clinical.patients.view)],
            loadComponent: () =>
              import('./pages/dashboard/patients/patient-details/patient-details').then(
                (page) => page.PatientDetails,
              ),
          },
          {
            path: '',
            canActivate: [requireAllPermissions(ACCESS.clinical.patients.list)],
            loadComponent: () =>
              import('./pages/dashboard/patients/patients').then((page) => page.Patients),
          },
        ],
      },
      {
        path: 'assessments/:assessmentId',
        canActivate: [requireAllPermissions(ACCESS.clinical.assessments.view)],
        loadComponent: () =>
          import('./pages/dashboard/assessments/assessment-details/assessment-details').then(
            (page) => page.AssessmentDetails,
          ),
      },
      {
        path: 'assessments',
        canActivate: [requireAllPermissions(ACCESS.clinical.assessments.list)],
        loadComponent: () =>
          import('./pages/dashboard/assessments/assessments').then(
            (page) => page.Assessments,
          ),
      },
      {
        path: 'assessment',
        canActivate: [
          requireAllPermissions(ACCESS.clinical.assessments.createWithNewPatient),
        ],
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
      {
        path: '',
        canActivate: [
          requireAnyPermission([
            ...ACCESS.clinical.assessments.list,
            ...ACCESS.clinical.patients.list,
          ]),
        ],
        loadComponent: () => import('./pages/dashboard/home/home').then((page) => page.Home),
      },
    ],
  },
];
