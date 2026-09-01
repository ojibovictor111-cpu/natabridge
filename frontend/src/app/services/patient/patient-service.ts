import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  CreatePatientInput,
  CreatedPatientApi,
  PatientApi,
} from '../../models/patient/Patient.api';
import { ApiResponse } from '../../models/api/ApiResponse';
import { Environment as environment } from '../../environment/environment';
import { finalize } from 'rxjs';

@Service()
export class PatientService {
  private readonly http = inject(HttpClient);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly patient = signal<PatientApi | null>(null);
  readonly patients = signal<PatientApi[]>([]);

  getPatients() {
    this.loadPatients();
  }

  registerPatient(patient: CreatePatientInput) {
    return this.http.post<ApiResponse<CreatedPatientApi>>(`${environment.api}/patients`, patient, {
      withCredentials: true,
    });
  }

  getPatient(patientId: string) {
    this.errorMessage.set(null);

    const cachedPatient = this.patients().find((patient) => patient.id === patientId);

    if (cachedPatient) {
      this.patient.set(cachedPatient);
      this.loading.set(false);
      return;
    }

    this.patient.set(null);
    this.loadPatients(patientId);
  }

  private loadPatients(selectedPatientId?: string) {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.http
      .get<ApiResponse<PatientApi[]>>(`${environment.api}/patients`, {
        withCredentials: true,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const patients = response.data ?? [];
          this.patients.set(patients);

          if (!selectedPatientId) return;

          const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
          this.patient.set(selectedPatient ?? null);

          if (!selectedPatient) {
            this.errorMessage.set('Patient record could not be found.');
          }
        },
        error: (error: HttpErrorResponse) => {
          if (selectedPatientId) this.patient.set(null);
          this.errorMessage.set(this.getErrorMessage(error));
        },
      });
  }

  private getErrorMessage(error: HttpErrorResponse) {
    const apiMessage = error.error?.message;

    if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;

    if (error.status === 0) {
      return 'Unable to reach patient records. Check your connection and try again.';
    }

    return 'Unable to load patient records right now. Please try again.';
  }
}
