import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PatientService } from '../../../../services/patient/patient-service';
import { RegisterPatient } from './register-patient';

describe('RegisterPatient', () => {
  let component: RegisterPatient;
  let fixture: ComponentFixture<RegisterPatient>;
  let registerPatient: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(async () => {
    registerPatient = vi.fn().mockReturnValue(
      of({
        data: {
          id: 'patient-3',
          firstName: 'Amina',
          middleName: null,
          lastName: 'Bello',
          dob: '1997-04-12',
          email: 'amina@example.com',
          phone: null,
          createdAt: '2026-09-01T12:00:00.000Z',
        },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [RegisterPatient],
      providers: [
        provideRouter([]),
        { provide: PatientService, useValue: { registerPatient } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(RegisterPatient);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders registration fields without assessment measurements', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('#firstName')).not.toBeNull();
    expect(page.querySelector('#gestationalAge')).not.toBeNull();
    expect(page.querySelector('#systolicBP')).toBeNull();
    expect(page.querySelector('#heartRate')).toBeNull();
    expect(page.querySelector<HTMLAnchorElement>('.patient-detail-back')?.getAttribute('href')).toBe(
      '/dashboard/patients',
    );
  });

  it('requires at least one patient contact method', () => {
    component.registrationForm.patchValue({
      firstName: 'Amina',
      lastName: 'Bello',
      dob: '1997-04-12',
    });

    expect(component.registrationForm.hasError('contactRequired')).toBe(true);

    component.registrationForm.controls.phone.setValue('+2348000000000');

    expect(component.registrationForm.hasError('contactRequired')).toBe(false);
  });

  it('submits normalized registration data and opens the created patient record', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.registrationForm.setValue({
      firstName: '  Amina ',
      middleName: ' ',
      lastName: ' Bello  ',
      dob: '1997-04-12',
      email: 'amina@example.com',
      phone: null,
      gestationalAge: 24,
      firstPregnancy: false,
      previousComplications: ' Previous pre-eclampsia ',
    });

    component.submit();

    expect(registerPatient).toHaveBeenCalledWith({
      firstName: 'Amina',
      middleName: null,
      lastName: 'Bello',
      dob: '1997-04-12',
      email: 'amina@example.com',
      phone: null,
      gestationalAge: 24,
      firstPregnancy: false,
      previousComplications: 'Previous pre-eclampsia',
    });
    expect(navigate).toHaveBeenCalledWith(['/dashboard/patients', 'patient-3']);
  });
});
